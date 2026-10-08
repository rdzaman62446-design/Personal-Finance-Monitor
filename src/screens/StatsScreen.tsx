import { Feather } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import DailyChart from '../components/DailyChart';
import { AnimatedBar, AnimatedNumber, FadeInView, PressableScale } from '../components/motion';
import {
  CATEGORIES,
  categoryColor,
  categoryIcon,
  daysInMonth,
  Expense,
  isIncome,
  isInMonth,
  Month,
  monthLabel,
  monthOf,
  peso,
  sameMonth,
  shiftMonth,
  totalIncome,
  totalSpent,
} from '../expenses';
import { ordinal, Recurring } from '../recurring';
import { budgetColor, Theme } from '../theme';

type Props = {
  theme: Theme;
  expenses: Expense[];
  monthlyBudget: number | null;
  categoryBudgets: Record<string, number>;
  recurring: Recurring[];
  onSetBudget: () => void;
  onSetCategoryBudget: (category: string) => void;
  onDeleteRecurring: (rule: Recurring) => void;
  onBackup: () => void;
  onRestore: () => void;
  onImport: () => void;
  onClear: () => void;
};

export default function StatsScreen({
  theme: t,
  expenses,
  monthlyBudget,
  categoryBudgets,
  recurring,
  onSetBudget,
  onSetCategoryBudget,
  onDeleteRecurring,
  onBackup,
  onRestore,
  onImport,
  onClear,
}: Props) {
  const [thisMonth] = useState(() => monthOf(Date.now()));
  const [todayOfMonth] = useState(() => new Date().getDate());
  const [month, setMonth] = useState<Month>(thisMonth);
  const isCurrent = sameMonth(month, thisMonth);

  const monthEntries = useMemo(() => expenses.filter((e) => isInMonth(e.timestamp, month)), [expenses, month]);
  const spent = totalSpent(monthEntries);
  const income = totalIncome(monthEntries);
  const saved = income - spent;
  const prevSpent = useMemo(
    () => totalSpent(expenses.filter((e) => isInMonth(e.timestamp, shiftMonth(month, -1)))),
    [expenses, month],
  );
  // For the current month, average over the days so far; for past months, over the whole month.
  const daysCounted = isCurrent ? todayOfMonth : daysInMonth(month);
  const dailyAvg = spent / daysCounted;
  const change = prevSpent > 0 ? ((spent - prevSpent) / prevSpent) * 100 : null;
  const expenseCount = monthEntries.filter((e) => !isIncome(e)).length;

  const categoryRows = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of monthEntries) if (!isIncome(e)) map[e.category] = (map[e.category] ?? 0) + e.amount;
    // This month lists every category so budgets can be set before spending; past months only those used.
    const names = isCurrent
      ? Array.from(new Set([...CATEGORIES.map((c) => c.name), ...Object.keys(map)]))
      : Object.keys(map);
    return names
      .map((name) => ({ name, total: map[name] ?? 0, share: spent > 0 ? ((map[name] ?? 0) / spent) * 100 : 0 }))
      .sort((a, b) => b.total - a.total);
  }, [monthEntries, spent, isCurrent]);

  const monthId = `${month.year}-${month.month}`;
  const ratio = monthlyBudget ? spent / monthlyBudget : 0;
  const recurringTotal = recurring.reduce((s, r) => s + r.amount, 0);

  const confirmClear = () =>
    Alert.alert('Delete all entries?', 'This cannot be undone. Make a backup first if you might need them.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear Data', style: 'destructive', onPress: onClear },
    ]);

  const confirmDeleteRecurring = (r: Recurring) =>
    Alert.alert(
      'Stop this monthly expense?',
      `"${r.item}" won't be logged in future months. Entries already logged stay.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Stop', style: 'destructive', onPress: () => onDeleteRecurring(r) },
      ],
    );

  const stat = (label: string, value: number, sub: string, color: string, delay: number, format = peso) => (
    <FadeInView delay={delay} style={styles.statWrap}>
      <View style={[styles.stat, { backgroundColor: t.card, borderColor: t.border }]}>
        <Text style={{ color: t.textMuted, fontSize: 12, fontWeight: '500' }}>{label}</Text>
        <AnimatedNumber value={value} format={format} numberOfLines={1} style={[styles.statValue, { color }]} />
        <Text numberOfLines={1} style={{ color: t.textFaint, fontSize: 11, marginTop: 4 }}>
          {sub}
        </Text>
      </View>
    </FadeInView>
  );

  const action = (icon: keyof typeof Feather.glyphMap, label: string, onPress: () => void, color = t.text) => (
    <PressableScale onPress={onPress} style={[styles.action, { borderColor: t.border }]}>
      <Feather name={icon} size={18} color={color} />
      <Text style={{ color, fontSize: 12, fontWeight: '600' }}>{label}</Text>
    </PressableScale>
  );

  const header = (icon: keyof typeof Feather.glyphMap, title: string, right?: string) => (
    <View style={styles.cardHeader}>
      <View style={styles.row}>
        <Feather name={icon} size={16} color={t.accent} />
        <Text style={[styles.cardTitle, { color: t.text }]}>{title}</Text>
      </View>
      {right && <Text style={{ color: t.textMuted, fontSize: 12 }}>{right}</Text>}
    </View>
  );

  return (
    <View style={{ gap: 16 }}>
      <View style={[styles.monthBar, { backgroundColor: t.card, borderColor: t.border }]}>
        <PressableScale hitSlop={10} onPress={() => setMonth(shiftMonth(month, -1))} style={styles.arrow}>
          <Feather name="chevron-left" size={20} color={t.text} />
        </PressableScale>
        <Pressable onPress={() => setMonth(thisMonth)}>
          <Text style={{ color: t.text, fontWeight: '700', fontSize: 15 }}>{monthLabel(month)}</Text>
          {!isCurrent && <Text style={{ color: t.accent, fontSize: 10, textAlign: 'center' }}>Tap for this month</Text>}
        </Pressable>
        <PressableScale
          hitSlop={10}
          disabled={isCurrent}
          onPress={() => setMonth(shiftMonth(month, 1))}
          style={[styles.arrow, { opacity: isCurrent ? 0.3 : 1 }]}
        >
          <Feather name="chevron-right" size={20} color={t.text} />
        </PressableScale>
      </View>

      {/* Re-keyed per month so the whole section animates in when switching months. */}
      <View key={monthId} style={{ gap: 16 }}>
        <View style={styles.grid}>
          {stat(
            'Spent',
            spent,
            change == null
              ? `${expenseCount} expenses`
              : `${change > 0 ? '▲' : change < 0 ? '▼' : ''} ${Math.abs(change).toFixed(0)}% vs last month`,
            t.accent,
            0,
          )}
          {stat('Income', income, income > 0 ? 'logged this month' : 'tap Income on Add', t.income, 60)}
          {stat(
            saved >= 0 ? 'Saved' : 'Overspent',
            Math.abs(saved),
            income > 0 ? `${((saved / income) * 100).toFixed(0)}% of income` : 'add income to see savings',
            saved >= 0 ? t.accent : t.danger,
            120,
          )}
          {stat('Daily Average', dailyAvg, isCurrent ? `over ${daysCounted} days so far` : `over ${daysCounted} days`, t.amber, 180)}
        </View>

        <FadeInView delay={200}>
          <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
            {header('bar-chart-2', 'Daily Spending')}
            <DailyChart theme={t} expenses={monthEntries} month={month} today={isCurrent ? todayOfMonth : null} />
          </View>
        </FadeInView>

        {isCurrent && (
          <FadeInView delay={240}>
            <Pressable onPress={onSetBudget} style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
              <View style={styles.cardHeader}>
                <View style={styles.row}>
                  <Feather name="target" size={16} color={t.accent} />
                  <Text style={[styles.cardTitle, { color: t.text }]}>Monthly Budget</Text>
                </View>
                <Text style={{ color: t.accent, fontSize: 12, fontWeight: '600' }}>{monthlyBudget ? 'Edit' : 'Set'}</Text>
              </View>
              {monthlyBudget ? (
                <>
                  <AnimatedBar percent={ratio * 100} color={budgetColor(t, ratio)} trackColor={t.border} height={10} />
                  <Text style={{ color: t.textMuted, fontSize: 12 }}>
                    {peso(spent)} of {peso(monthlyBudget)} · {(ratio * 100).toFixed(0)}% used
                  </Text>
                </>
              ) : (
                <Text style={{ color: t.textMuted, fontSize: 12 }}>Set a limit and watch the bar fill up as you spend.</Text>
              )}
            </Pressable>
          </FadeInView>
        )}

        <FadeInView delay={280}>
          <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
            {header('pie-chart', 'By Category')}
            {spent > 0 && (
              <View style={styles.stacked}>
                {categoryRows
                  .filter((c) => c.total > 0)
                  .map((c) => (
                    <View key={c.name} style={{ flex: c.total, backgroundColor: categoryColor(c.name) }} />
                  ))}
              </View>
            )}
            {categoryRows.length === 0 ? (
              <Text style={{ color: t.textFaint, fontSize: 12, textAlign: 'center', paddingVertical: 12 }}>
                No spending in {monthLabel(month)}.
              </Text>
            ) : (
              categoryRows.map((c, i) => {
                const budget = isCurrent ? categoryBudgets[c.name] : undefined;
                const r = budget ? c.total / budget : 0;
                return (
                  <Pressable
                    key={c.name}
                    disabled={!isCurrent}
                    onPress={() => onSetCategoryBudget(c.name)}
                    style={({ pressed }) => [{ gap: 6, opacity: pressed ? 0.6 : 1 }]}
                  >
                    <View style={styles.cardHeader}>
                      <View style={[styles.row, { flex: 1 }]}>
                        <View style={[styles.dot, { backgroundColor: categoryColor(c.name) }]} />
                        <Text numberOfLines={1} style={{ color: t.text, fontSize: 12, fontWeight: '500', flexShrink: 1 }}>
                          {categoryIcon(c.name)} {c.name}
                        </Text>
                      </View>
                      <Text style={{ color: budget ? budgetColor(t, r) : t.textMuted, fontSize: 12 }}>
                        {budget ? `${peso(c.total)} / ${peso(budget)}` : `${peso(c.total)} (${c.share.toFixed(0)}%)`}
                      </Text>
                    </View>
                    <AnimatedBar
                      percent={budget ? r * 100 : c.share}
                      color={budget ? budgetColor(t, r) : categoryColor(c.name)}
                      trackColor={t.border}
                      delay={320 + i * 60}
                    />
                  </Pressable>
                );
              })
            )}
            {isCurrent && (
              <Text style={{ color: t.textFaint, fontSize: 11, textAlign: 'center' }}>Tap a category to set its own budget</Text>
            )}
          </View>
        </FadeInView>
      </View>

      <FadeInView delay={320}>
        <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
          {header('repeat', 'Monthly Expenses', recurring.length ? `${peso(recurringTotal)} / month` : undefined)}
          {recurring.length === 0 ? (
            <Text style={{ color: t.textMuted, fontSize: 12 }}>
              Turn on “Repeat monthly” when adding rent, bills or subscriptions and they’ll be logged automatically.
            </Text>
          ) : (
            recurring.map((r) => (
              <View key={r.id} style={[styles.recurringRow, { borderColor: t.border }]}>
                <Text style={{ fontSize: 18 }}>{categoryIcon(r.category)}</Text>
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={{ color: t.text, fontSize: 13, fontWeight: '600' }}>
                    {r.item}
                  </Text>
                  <Text style={{ color: t.textMuted, fontSize: 11 }}>Every {ordinal(r.day)} of the month</Text>
                </View>
                <Text style={{ color: t.accent, fontWeight: '700' }}>{peso(r.amount)}</Text>
                <Pressable hitSlop={10} onPress={() => confirmDeleteRecurring(r)}>
                  <Feather name="x" size={18} color={t.textFaint} />
                </Pressable>
              </View>
            ))
          )}
        </View>
      </FadeInView>

      <FadeInView delay={360}>
        <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
          {header('hard-drive', 'Your Data')}
          <Text style={{ color: t.textMuted, fontSize: 12 }}>
            Data lives only on this phone. Back up to Google Drive or Files so you never lose it. Import adds rows from a spreadsheet.
          </Text>
          <View style={styles.actions}>
            {action('upload-cloud', 'Backup', onBackup, t.accent)}
            {action('download-cloud', 'Restore', onRestore)}
            {action('file-plus', 'Import', onImport)}
            {action('trash-2', 'Clear', confirmClear, t.danger)}
          </View>
        </View>
      </FadeInView>
    </View>
  );
}

const styles = StyleSheet.create({
  monthBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  arrow: { padding: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statWrap: { width: '47.5%', flexGrow: 1 },
  stat: { padding: 16, borderRadius: 16, borderWidth: 1 },
  statValue: { fontSize: 18, fontWeight: '800', marginTop: 4 },
  card: { padding: 18, borderRadius: 18, borderWidth: 1, gap: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontWeight: '600', fontSize: 14 },
  stacked: { flexDirection: 'row', height: 14, borderRadius: 999, overflow: 'hidden', gap: 2 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  recurringRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actions: { flexDirection: 'row', gap: 8 },
  action: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
});
