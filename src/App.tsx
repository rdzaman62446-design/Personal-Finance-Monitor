import { Feather } from '@expo/vector-icons';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { StatusBar } from 'expo-status-bar';
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  AppState,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { pickBackup, shareBackup } from './backup';
import BudgetModal from './components/BudgetModal';
import EditModal from './components/EditModal';
import ImportModal from './components/ImportModal';
import IncomeSourceModal from './components/IncomeSourceModal';
import SideMenu from './components/SideMenu';
import { PressableScale } from './components/motion';
import Toast, { ToastData } from './components/Toast';
import {
  categoryIcon,
  Expense,
  formatDate,
  isIncome,
  isInMonth,
  isSameDay,
  monthKey,
  monthOf,
  peso,
  toCSV,
  totalIncome,
  totalSpent,
} from './expenses';
import { ImportResult } from './importer';
import { IncomeSource } from './incomeSources';
import { collectDue, entryFor, Recurring } from './recurring';
import AddScreen from './screens/AddScreen';
import HistoryScreen from './screens/HistoryScreen';
import StatsScreen from './screens/StatsScreen';
import { usePersistentState } from './storage';
import { darkTheme, lightTheme } from './theme';
import { useUpdateCheck, versionLabel } from './updates';

type Tab = 'add' | 'history' | 'stats';

const TABS: { key: Tab; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { key: 'add', label: 'Add Log', icon: 'plus' },
  { key: 'history', label: 'Table Log', icon: 'list' },
  { key: 'stats', label: 'Stats', icon: 'bar-chart-2' },
];

export default function App() {
  return (
    <SafeAreaProvider>
      <Main />
    </SafeAreaProvider>
  );
}

function Main() {
  useUpdateCheck();

  const [expenses, setExpenses, expensesLoaded] = usePersistentState<Expense[]>('spendtrack.expenses', []);
  const [darkMode, setDarkMode] = usePersistentState('spendtrack.darkMode', true);
  const [monthlyBudget, setMonthlyBudget] = usePersistentState<number | null>('spendtrack.monthlyBudget', null);
  const [categoryBudgets, setCategoryBudgets] = usePersistentState<Record<string, number>>('spendtrack.categoryBudgets', {});
  const [recurring, setRecurring, recurringLoaded] = usePersistentState<Recurring[]>('spendtrack.recurring', []);
  const [incomeSources, setIncomeSources] = usePersistentState<IncomeSource[]>('spendtrack.incomeSources', []);
  const [pastSavings, setPastSavings] = usePersistentState<number | null>('spendtrack.pastSavings', null);
  const [tab, setTab] = useState<Tab>('add');
  const [editing, setEditing] = useState<Expense | null>(null);
  // Which budget the budget sheet is editing: the overall monthly one (category null) or a category's.
  const [budgetTarget, setBudgetTarget] = useState<{ category: string | null } | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pastSavingsOpen, setPastSavingsOpen] = useState(false);
  // The income source being edited: { source: null } adds a new one.
  const [sourceTarget, setSourceTarget] = useState<{ source: IncomeSource | null } | null>(null);
  const pagerRef = useRef<ScrollView>(null);
  const { width: pageWidth } = useWindowDimensions();
  const [scrollX] = useState(() => new Animated.Value(0));
  // Fractional page index (0 = Add, 1 = Table Log, 2 = Stats) while swiping.
  const pagePosition = useMemo(() => Animated.divide(scrollX, pageWidth || 1), [scrollX, pageWidth]);
  const t = darkMode ? darkTheme : lightTheme;

  // "Now" for the Today / This Month totals and recurring entries; refreshed when
  // the app comes back to the foreground or an entry is added, so it rolls over at midnight.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => state === 'active' && setNow(Date.now()));
    return () => sub.remove();
  }, []);

  // Log any monthly expenses that have come due since the app was last opened.
  useEffect(() => {
    if (!expensesLoaded || !recurringLoaded) return;
    const due = collectDue(recurring, now);
    if (due.rules === recurring) return;
    setRecurring(due.rules);
    setExpenses((prev) => {
      const ids = new Set(prev.map((e) => e.id));
      const fresh = due.entries.filter((e) => !ids.has(e.id));
      return fresh.length ? [...prev, ...fresh].sort((a, b) => b.timestamp - a.timestamp) : prev;
    });
  }, [expensesLoaded, recurringLoaded, recurring, now, setRecurring, setExpenses]);

  const todayEntries = useMemo(() => expenses.filter((e) => isSameDay(e.timestamp, now)), [expenses, now]);
  const monthEntries = useMemo(() => {
    const m = monthOf(now);
    return expenses.filter((e) => isInMonth(e.timestamp, m));
  }, [expenses, now]);
  const spentToday = totalSpent(todayEntries);
  const spentThisMonth = totalSpent(monthEntries);
  const incomeThisMonth = totalIncome(monthEntries);
  const allIncome = totalIncome(expenses);
  const totalSavings = pastSavings != null || allIncome > 0 ? (pastSavings ?? 0) + allIncome - totalSpent(expenses) : null;

  const showToast = (message: string, actionLabel?: string, onAction?: () => void) =>
    setToast({ id: Date.now(), message, actionLabel, onAction });
  const hideToast = useCallback(() => setToast(null), []);

  const switchTab = (next: Tab) => {
    setTab(next);
    pagerRef.current?.scrollTo({ x: TABS.findIndex((x) => x.key === next) * pageWidth, animated: true });
  };

  // Warns when this expense pushes its category (or the whole month) over budget.
  const budgetWarning = (e: Omit<Expense, 'id' | 'timestamp'>) => {
    const catBudget = categoryBudgets[e.category];
    const catSpent = totalSpent(monthEntries.filter((x) => x.category === e.category));
    if (catBudget && catSpent < catBudget && catSpent + e.amount >= catBudget) {
      return `⚠️ ${e.category} is now over its ${peso(catBudget)} budget`;
    }
    if (monthlyBudget && spentThisMonth < monthlyBudget && spentThisMonth + e.amount >= monthlyBudget) {
      return `⚠️ You've reached your ${peso(monthlyBudget)} monthly budget`;
    }
    return null;
  };

  const addEntry = (e: Omit<Expense, 'id' | 'timestamp'>, repeatMonthly: boolean) => {
    const ts = Date.now();
    setNow(ts);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (repeatMonthly) {
      // This month's entry is logged now; the rule picks up from next month.
      const rule: Recurring = {
        id: ts.toString(36),
        item: e.item,
        amount: e.amount,
        category: e.category,
        day: new Date(ts).getDate(),
        lastPosted: monthKey(monthOf(ts)),
      };
      setRecurring((prev) => [...prev, rule]);
      setExpenses((prev) => [{ ...entryFor(rule, monthOf(ts)), timestamp: ts }, ...prev]);
    } else {
      setExpenses((prev) => [{ ...e, id: ts.toString(), timestamp: ts }, ...prev]);
    }
    const warning = isIncome(e as Expense) ? null : budgetWarning(e);
    if (warning) showToast(warning);
    else if (repeatMonthly) showToast(`"${e.item}" will be logged every month`);
  };

  const deleteEntry = (target: Expense) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpenses((prev) => prev.filter((e) => e.id !== target.id));
    showToast(`Deleted "${target.item}"`, 'UNDO', () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
      setExpenses((prev) => [...prev, target].sort((a, b) => b.timestamp - a.timestamp));
    });
  };

  const saveEdit = (updated: Expense) => {
    setExpenses((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    setEditing(null);
    showToast('Changes saved');
  };

  const deleteRecurring = (rule: Recurring) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setRecurring((prev) => prev.filter((r) => r.id !== rule.id));
    showToast(`"${rule.item}" stopped`, 'UNDO', () => setRecurring((prev) => [...prev, rule]));
  };

  const saveIncomeSource = (src: IncomeSource) => {
    const exists = incomeSources.some((x) => x.id === src.id);
    setIncomeSources((prev) => (exists ? prev.map((x) => (x.id === src.id ? src : x)) : [...prev, src]));
    setSourceTarget(null);
    showToast(exists ? `"${src.name}" updated` : `"${src.name}" saved — pick it from Income on payday`);
  };

  const deleteIncomeSource = (src: IncomeSource) => {
    setIncomeSources((prev) => prev.filter((x) => x.id !== src.id));
    setSourceTarget(null);
    showToast(`"${src.name}" deleted`, 'UNDO', () => setIncomeSources((prev) => [...prev, src]));
  };

  const savePastSavings = (amount: number | null) => {
    setPastSavings(amount);
    setPastSavingsOpen(false);
    showToast(amount ? 'Past savings saved' : 'Past savings removed');
  };

  const saveBudget = (budget: number | null) => {
    const category = budgetTarget?.category ?? null;
    if (category) {
      setCategoryBudgets((prev) => {
        const next = { ...prev };
        if (budget) next[category] = budget;
        else delete next[category];
        return next;
      });
      showToast(budget ? `${category} budget saved` : `${category} budget removed`);
    } else {
      setMonthlyBudget(budget);
      showToast(budget ? 'Monthly budget saved' : 'Monthly budget removed');
    }
    setBudgetTarget(null);
  };

  const exportCSV = async () => {
    if (expenses.length === 0) {
      showToast('Nothing to export yet');
      return;
    }
    try {
      const file = new File(Paths.cache, `Expense_Log_${new Date().toISOString().slice(0, 10)}.csv`);
      file.create({ overwrite: true });
      file.write(toCSV(expenses));
      await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: 'Export expenses' });
    } catch (err) {
      Alert.alert('Export failed', String(err));
    }
  };

  const backup = async () => {
    try {
      await shareBackup({ expenses, monthlyBudget, categoryBudgets, recurring, incomeSources, pastSavings });
    } catch (err) {
      Alert.alert('Backup failed', String(err));
    }
  };

  const restore = async () => {
    try {
      const data = await pickBackup();
      if (!data) return;
      const apply = (nextExpenses: Expense[], nextRecurring: Recurring[]) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpenses(nextExpenses.sort((a, b) => b.timestamp - a.timestamp));
        setRecurring(nextRecurring);
        if (data.monthlyBudget != null) setMonthlyBudget(data.monthlyBudget);
        if (Object.keys(data.categoryBudgets).length) setCategoryBudgets((prev) => ({ ...prev, ...data.categoryBudgets }));
        if (data.pastSavings != null) setPastSavings(data.pastSavings);
        if (data.incomeSources.length) {
          setIncomeSources((prev) => {
            const ids = new Set(prev.map((x) => x.id));
            return [...prev, ...data.incomeSources.filter((x) => !ids.has(x.id))];
          });
        }
        showToast(`Restored ${data.expenses.length} entries`);
      };
      Alert.alert(
        'Restore backup?',
        `The backup has ${data.expenses.length} entries. You currently have ${expenses.length}.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Merge',
            onPress: () => {
              const ids = new Set(expenses.map((e) => e.id));
              const ruleIds = new Set(recurring.map((r) => r.id));
              apply(
                [...expenses, ...data.expenses.filter((e) => !ids.has(e.id))],
                [...recurring, ...data.recurring.filter((r) => !ruleIds.has(r.id))],
              );
            },
          },
          { text: 'Replace', style: 'destructive', onPress: () => apply([...data.expenses], data.recurring) },
        ],
      );
    } catch (err) {
      Alert.alert('Restore failed', err instanceof Error ? err.message : String(err));
    }
  };

  // Shows what was found in the spreadsheet and adds the rows that aren't already in the app.
  const confirmImport = (result: ImportResult) => {
    const ids = new Set(expenses.map((e) => e.id));
    const fresh = result.entries.filter((e) => !ids.has(e.id));
    const dupes = result.entries.length - fresh.length;
    if (fresh.length === 0) {
      setImportOpen(false);
      Alert.alert('Already imported', `All ${result.entries.length} rows from "${result.sheetName}" are already in the app.`);
      return;
    }
    const times = fresh.map((e) => e.timestamp);
    const range = `${formatDate(Math.min(...times))} – ${formatDate(Math.max(...times))}`;
    const lines = [
      `Sheet: ${result.sheetName}`,
      `${fresh.length} new entries (${range})`,
      `Spent: ${peso(totalSpent(fresh))}`,
      totalIncome(fresh) > 0 ? `Income: ${peso(totalIncome(fresh))}` : null,
      dupes > 0 ? `${dupes} already in the app — skipped` : null,
      result.skipped > 0 ? `${result.skipped} rows couldn’t be read — skipped` : null,
    ].filter(Boolean);
    Alert.alert('Import these entries?', lines.join('\n'), [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Import',
        onPress: () => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setExpenses((prev) => [...prev, ...fresh].sort((a, b) => b.timestamp - a.timestamp));
          setImportOpen(false);
          setNow(Date.now());
          showToast(`Imported ${fresh.length} entries`, 'VIEW', () => switchTab('history'));
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: t.bg }]} edges={['top', 'left', 'right']}>
      <StatusBar style={darkMode ? 'light' : 'dark'} />

      <View style={[styles.header, { backgroundColor: t.card, borderBottomColor: t.border }]}>
        <PressableScale scaleTo={0.85} hitSlop={8} onPress={() => setMenuOpen(true)} style={styles.menuBtn}>
          <Feather name="menu" size={22} color={t.text} />
        </PressableScale>
        <View style={[styles.logo, { backgroundColor: t.accentSoft }]}>
          <Feather name="credit-card" size={16} color={t.accent} />
        </View>
        <Text style={{ color: t.text, fontWeight: '800', fontSize: 18 }}>SpendTrack</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Swipeable pages; the tab bar highlight follows the scroll position. */}
        <Animated.ScrollView
          ref={pagerRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          scrollEventThrottle={16}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: true })}
          onMomentumScrollEnd={(e) => {
            const i = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
            setTab(TABS[Math.max(0, Math.min(TABS.length - 1, i))].key);
          }}
        >
          <Page width={pageWidth}>
            <AddScreen
              theme={t}
              expenses={expenses}
              spentToday={spentToday}
              spentThisMonth={spentThisMonth}
              incomeThisMonth={incomeThisMonth}
              monthlyBudget={monthlyBudget}
              totalSavings={totalSavings}
              incomeSources={incomeSources}
              onAddIncomeSource={() => setSourceTarget({ source: null })}
              onAdd={addEntry}
              onViewAll={() => switchTab('history')}
              onSetBudget={() => setBudgetTarget({ category: null })}
            />
          </Page>
          <Page width={pageWidth}>
            <HistoryScreen theme={t} expenses={expenses} onEdit={setEditing} onDelete={deleteEntry} />
          </Page>
          <Page width={pageWidth}>
            <StatsScreen
              theme={t}
              expenses={expenses}
              monthlyBudget={monthlyBudget}
              categoryBudgets={categoryBudgets}
              recurring={recurring}
              incomeSources={incomeSources}
              pastSavings={pastSavings}
              onEditPastSavings={() => setPastSavingsOpen(true)}
              onEditIncomeSource={(source) => setSourceTarget({ source })}
              onSetBudget={() => setBudgetTarget({ category: null })}
              onSetCategoryBudget={(category) => setBudgetTarget({ category })}
              onDeleteRecurring={deleteRecurring}
              onBackup={backup}
              onRestore={restore}
              onImport={() => setImportOpen(true)}
              onClear={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setExpenses([]);
                setRecurring([]);
                showToast('All entries cleared');
              }}
            />
          </Page>
        </Animated.ScrollView>
      </KeyboardAvoidingView>

      <TabBar tab={tab} position={pagePosition} onChange={switchTab} theme={t} />

      <Toast theme={t} toast={toast} onHide={hideToast} />
      <EditModal theme={t} expense={editing} onClose={() => setEditing(null)} onSave={saveEdit} />
      <SideMenu
        theme={t}
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        darkMode={darkMode}
        onToggleTheme={() => setDarkMode(!darkMode)}
        footer={`SpendTrack ${versionLabel()}`}
        sections={[
          {
            title: 'GO TO',
            items: [
              { icon: 'plus-circle', label: 'Add Log', onPress: () => switchTab('add') },
              { icon: 'list', label: 'Table Log', onPress: () => switchTab('history') },
              { icon: 'bar-chart-2', label: 'Stats', onPress: () => switchTab('stats') },
            ],
          },
          {
            title: 'MONEY',
            items: [
              { icon: 'target', label: 'Monthly budget', onPress: () => setBudgetTarget({ category: null }) },
              { icon: 'briefcase', label: 'Add income source', onPress: () => setSourceTarget({ source: null }) },
              { icon: 'trending-up', label: 'Past savings', onPress: () => setPastSavingsOpen(true) },
            ],
          },
          {
            title: 'DATA',
            items: [
              { icon: 'download', label: 'Export to CSV', onPress: exportCSV },
              { icon: 'file-plus', label: 'Import from spreadsheet', onPress: () => setImportOpen(true) },
              { icon: 'upload-cloud', label: 'Back up', onPress: backup },
              { icon: 'download-cloud', label: 'Restore backup', onPress: restore },
            ],
          },
        ]}
      />
      <IncomeSourceModal
        theme={t}
        visible={sourceTarget != null}
        source={sourceTarget?.source ?? null}
        onClose={() => setSourceTarget(null)}
        onSave={saveIncomeSource}
        onDelete={deleteIncomeSource}
      />
      <BudgetModal
        theme={t}
        visible={pastSavingsOpen}
        title="🏦 Savings before SpendTrack"
        subtitle="Money you had saved before you started logging here. It's added to your total savings."
        current={pastSavings}
        onClose={() => setPastSavingsOpen(false)}
        onSave={savePastSavings}
      />
      <ImportModal theme={t} visible={importOpen} onClose={() => setImportOpen(false)} onResult={confirmImport} />
      <BudgetModal
        theme={t}
        visible={budgetTarget != null}
        title={budgetTarget?.category ? `${categoryIcon(budgetTarget.category)} ${budgetTarget.category} budget` : 'Monthly budget'}
        subtitle={
          budgetTarget?.category
            ? `The most you want to spend on ${budgetTarget.category} each month.`
            : 'How much do you want to spend at most each month?'
        }
        current={budgetTarget?.category ? (categoryBudgets[budgetTarget.category] ?? null) : monthlyBudget}
        onClose={() => setBudgetTarget(null)}
        onSave={saveBudget}
      />
    </SafeAreaView>
  );
}

// Bottom navigation with a pill that tracks the pager's scroll position.
function TabBar({
  tab,
  position,
  onChange,
  theme: t,
}: {
  tab: Tab;
  position: Animated.AnimatedInterpolation<number> | Animated.Value;
  onChange: (t: Tab) => void;
  theme: typeof darkTheme;
}) {
  const [width, setWidth] = useState(0);
  const tabWidth = width / TABS.length;

  return (
    <SafeAreaView edges={['bottom']} style={[styles.nav, { backgroundColor: t.card, borderTopColor: t.border }]}>
      <View style={styles.navInner} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 && (
          <Animated.View
            style={[
              styles.navPill,
              {
                width: tabWidth - 24,
                backgroundColor: t.accentSoft,
                transform: [{ translateX: Animated.add(Animated.multiply(position, tabWidth), 12) }],
              },
            ]}
          />
        )}
        {TABS.map(({ key, label, icon }) => {
          const active = tab === key;
          const color = active ? t.accent : t.textMuted;
          return (
            <PressableScale key={key} scaleTo={0.88} onPress={() => onChange(key)} style={styles.navBtn}>
              <Feather name={icon} size={20} color={color} />
              <Text style={{ color, fontSize: 11, fontWeight: active ? '700' : '400' }}>{label}</Text>
            </PressableScale>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

// One full-width page of the pager, with its own vertical scrolling.
function Page({ width, children }: { width: number; children: ReactNode }) {
  return (
    <ScrollView style={{ width }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: { padding: 7, borderRadius: 10 },
  menuBtn: { padding: 4, marginRight: 4 },
  content: { padding: 16, paddingBottom: 32, width: '100%', maxWidth: 520, alignSelf: 'center' },
  nav: { borderTopWidth: 1 },
  navInner: { flexDirection: 'row', paddingVertical: 6 },
  navPill: { position: 'absolute', top: 4, bottom: 4, left: 0, borderRadius: 14 },
  navBtn: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 6 },
});
