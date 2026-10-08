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
  Pressable,
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
import { PressableScale } from './components/motion';
import Toast, { ToastData } from './components/Toast';
import { Expense, isInMonth, isSameDay, monthOf, toCSV } from './expenses';
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

  const [expenses, setExpenses] = usePersistentState<Expense[]>('spendtrack.expenses', []);
  const [darkMode, setDarkMode] = usePersistentState('spendtrack.darkMode', true);
  const [monthlyBudget, setMonthlyBudget] = usePersistentState<number | null>('spendtrack.monthlyBudget', null);
  const [tab, setTab] = useState<Tab>('add');
  const [editing, setEditing] = useState<Expense | null>(null);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);
  const pagerRef = useRef<ScrollView>(null);
  const { width: pageWidth } = useWindowDimensions();
  const [scrollX] = useState(() => new Animated.Value(0));
  // Fractional page index (0 = Add, 1 = Table Log, 2 = Stats) while swiping.
  const pagePosition = useMemo(() => Animated.divide(scrollX, pageWidth || 1), [scrollX, pageWidth]);
  const t = darkMode ? darkTheme : lightTheme;

  // "Now" for the Today / This Month totals; refreshed when the app comes back
  // to the foreground or an expense is added, so it rolls over at midnight.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => state === 'active' && setNow(Date.now()));
    return () => sub.remove();
  }, []);

  const spentToday = useMemo(
    () => expenses.filter((e) => isSameDay(e.timestamp, now)).reduce((s, e) => s + e.amount, 0),
    [expenses, now],
  );
  const spentThisMonth = useMemo(() => {
    const m = monthOf(now);
    return expenses.filter((e) => isInMonth(e.timestamp, m)).reduce((s, e) => s + e.amount, 0);
  }, [expenses, now]);

  const showToast = (message: string, actionLabel?: string, onAction?: () => void) =>
    setToast({ id: Date.now(), message, actionLabel, onAction });
  const hideToast = useCallback(() => setToast(null), []);

  const switchTab = (next: Tab) => {
    setTab(next);
    pagerRef.current?.scrollTo({ x: TABS.findIndex((x) => x.key === next) * pageWidth, animated: true });
  };

  const addExpense = (e: Omit<Expense, 'id' | 'timestamp'>) => {
    const ts = Date.now();
    setNow(ts);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpenses((prev) => [{ ...e, id: ts.toString(), timestamp: ts }, ...prev]);
  };

  const deleteExpense = (target: Expense) => {
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

  const saveBudget = (budget: number | null) => {
    setMonthlyBudget(budget);
    setBudgetOpen(false);
    showToast(budget ? 'Monthly budget saved' : 'Monthly budget removed');
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
      await shareBackup({ expenses, monthlyBudget });
    } catch (err) {
      Alert.alert('Backup failed', String(err));
    }
  };

  const restore = async () => {
    try {
      const data = await pickBackup();
      if (!data) return;
      const apply = (next: Expense[]) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpenses(next.sort((a, b) => b.timestamp - a.timestamp));
        if (data.monthlyBudget != null) setMonthlyBudget(data.monthlyBudget);
        showToast(`Restored ${data.expenses.length} expenses`);
      };
      Alert.alert(
        'Restore backup?',
        `The backup has ${data.expenses.length} expenses. You currently have ${expenses.length}.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Merge',
            onPress: () => {
              const ids = new Set(expenses.map((e) => e.id));
              apply([...expenses, ...data.expenses.filter((e) => !ids.has(e.id))]);
            },
          },
          { text: 'Replace', style: 'destructive', onPress: () => apply([...data.expenses]) },
        ],
      );
    } catch (err) {
      Alert.alert('Restore failed', err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: t.bg }]} edges={['top', 'left', 'right']}>
      <StatusBar style={darkMode ? 'light' : 'dark'} />

      <View style={[styles.header, { backgroundColor: t.card, borderBottomColor: t.border }]}>
        <View style={[styles.row, { flex: 1 }]}>
          <View style={[styles.logo, { backgroundColor: t.accentSoft }]}>
            <Feather name="credit-card" size={18} color={t.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: t.text, fontWeight: '700', fontSize: 17 }}>SpendTrack</Text>
            <Text numberOfLines={1} style={{ color: t.textMuted, fontSize: 10, fontWeight: '500' }}>
              PHP (₱) Quick Logger · {versionLabel()}
            </Text>
          </View>
        </View>
        <View style={styles.row}>
          <PressableScale scaleTo={0.85} onPress={exportCSV} style={[styles.iconBtn, { borderColor: t.border }]}>
            <Feather name="download" size={16} color={t.textMuted} />
          </PressableScale>
          <ThemeToggle darkMode={darkMode} onToggle={() => setDarkMode(!darkMode)} border={t.border} amber={t.amber} muted={t.textMuted} />
        </View>
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
              monthlyBudget={monthlyBudget}
              onAdd={addExpense}
              onViewAll={() => switchTab('history')}
              onSetBudget={() => setBudgetOpen(true)}
            />
          </Page>
          <Page width={pageWidth}>
            <HistoryScreen theme={t} expenses={expenses} onEdit={setEditing} onDelete={deleteExpense} />
          </Page>
          <Page width={pageWidth}>
            <StatsScreen
              theme={t}
              expenses={expenses}
              monthlyBudget={monthlyBudget}
              onSetBudget={() => setBudgetOpen(true)}
              onBackup={backup}
              onRestore={restore}
              onClear={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setExpenses([]);
                showToast('All expenses cleared');
              }}
            />
          </Page>
        </Animated.ScrollView>
      </KeyboardAvoidingView>

      <TabBar tab={tab} position={pagePosition} onChange={switchTab} theme={t} />

      <Toast theme={t} toast={toast} onHide={hideToast} />
      <EditModal theme={t} expense={editing} onClose={() => setEditing(null)} onSave={saveEdit} />
      <BudgetModal
        theme={t}
        visible={budgetOpen}
        current={monthlyBudget}
        onClose={() => setBudgetOpen(false)}
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

// Sun/moon button that spins when switching themes.
function ThemeToggle({
  darkMode,
  onToggle,
  border,
  amber,
  muted,
}: {
  darkMode: boolean;
  onToggle: () => void;
  border: string;
  amber: string;
  muted: string;
}) {
  const [spin] = useState(() => new Animated.Value(0));
  const press = () => {
    spin.setValue(0);
    Animated.timing(spin, { toValue: 1, duration: 450, useNativeDriver: true }).start();
    onToggle();
  };
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['-180deg', '0deg'] });
  return (
    <Pressable onPress={press} style={[styles.iconBtn, { borderColor: border }]}>
      <Animated.View style={{ transform: [{ rotate }] }}>
        <Feather name={darkMode ? 'sun' : 'moon'} size={16} color={darkMode ? amber : muted} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: { padding: 8, borderRadius: 12 },
  iconBtn: { padding: 8, borderRadius: 10, borderWidth: 1 },
  content: { padding: 16, paddingBottom: 32, width: '100%', maxWidth: 520, alignSelf: 'center' },
  nav: { borderTopWidth: 1 },
  navInner: { flexDirection: 'row', paddingVertical: 6 },
  navPill: { position: 'absolute', top: 4, bottom: 4, left: 0, borderRadius: 14 },
  navBtn: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 6 },
});
