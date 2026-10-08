import { Feather } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { AnimatedBar, AnimatedNumber, FadeInView, PressableScale } from '../components/motion';
import {
  categoryIcon,
  daysInMonth,
  Expense,
  isInMonth,
  Month,
  monthLabel,
  monthOf,
  peso,
  sameMonth,
  shiftMonth,
} from '../expenses';
import { budgetColor, Theme } from '../theme';

type Props = {
  theme: Theme;
  expenses: Expense[];
  monthlyBudget: number | null;
  onSetBudget: () => void;
  onBackup: () => void;
  onRestore: () => void;
  onClear: () => void;
};

const sumOf = (list: Expense[]) => list.reduce((s, e) => s + e.amount, 0);

export default function StatsScreen({ theme: t, expenses, monthlyBudget, onSetBudget, onBackup, onRestore, onClear }: Props) {
  const [thisMonth] = useState(() => monthOf(Date.now()));
  const [month, setMonth] = useState<Month>(thisMonth);
  const isCurrent = sameMonth(month, thisMonth);

  const monthExpenses = useMemo(() => expenses.filter((e) => isInMonth(e.timestamp, month)), [expenses, month]);
  const total = sumOf(monthExpenses);
  const prevTotal = useMemo(
    () => sumOf(expenses.filter((e) => isInMonth(e.timestamp, shiftMonth(month, -1)))),
    [expenses, month],
  );
  // For the current month, average over the days so far; for past months, over the whole month.
  const [todayOfMonth] = useState(() => new Date().getDate());
  const daysCounted = isCurrent ? todayOfMonth : daysInMonth(month);
  const dailyAvg = total / daysCounted;
  const change = prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : null;

  const categoryTotals = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of monthExpenses) map[e.category] = (map[e.category] ?? 0) + e.amount;
    return Object.entries(map)
      .map(([name, sum]) => ({ name, total: sum, percentage: total > 0 ? (sum / total) * 100 : 0 }))
      .sort((a, b) => b.total - a.total);
  }, [monthExpenses, total]);

  const top = categoryTotals[0];
  const monthKey = `${month.year}-${month.month}`;
  const ratio = monthlyBudget ? total / monthlyBudget : 0;

  const confirmClear = () =>
    Alert.alert('Delete all expenses?', 'This cannot be undone. Make a backup first if you might need them.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear Data', style: 'destructive', onPress: onClear },
    ]);

  const stat = (label: string, value: number | string, sub: string, color: string, delay: number) => (
    <FadeInView delay={delay} style={styles.statWrap}>
      <View style={[styles.stat, { backgroundColor: t.card, borderColor: t.border }]}>
        <Text style={{ color: t.textMuted, fontSize: 12, fontWeight: '500' }}>{label}</Text>
        {typeof value === 'number' ? (
          <AnimatedNumber value={value} format={peso} numberOfLines={1} style={[styles.statValue, { color }]} />
        ) : (
          <Text numberOfLines={1} style={[styles.statValue, { color, fontSize: 15 }]}>
            {value}
          </Text>
        )}
        <Text style={{ color: t.textFaint, fontSize: 11, marginTop: 4 }}>{sub}</Text>
      </View>
    </FadeInView>
  );

  const action = (icon: keyof typeof Feather.glyphMap, label: string, onPress: () => void, color = t.text) => (
    <PressableScale onPress={onPress} style={[styles.action, { borderColor: t.border }]}>
      <Feather name={icon} size={18} color={color} />
      <Text style={{ color, fontSize: 12, fontWeight: '600' }}>{label}</Text>
    </PressableScale>
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
      <View key={monthKey} style={{ gap: 16 }}>
        <View style={styles.grid}>
          {stat('Month Total', total, `${monthExpenses.length} entries`, t.accent, 0)}
          {stat('Daily Average', dailyAvg, isCurrent ? `over ${daysCounted} days so far` : `over ${daysCounted} days`, t.amber, 60)}
          {stat(
            'vs Last Month',
            change == null ? '—' : `${change > 0 ? '▲' : change < 0 ? '▼' : ''} ${Math.abs(change).toFixed(0)}%`,
            prevTotal > 0 ? `${peso(prevTotal)} last month` : 'no data last month',
            change == null ? t.textMuted : change > 0 ? t.danger : t.accent,
            120,
          )}
          {stat('Top Category', top ? `${categoryIcon(top.name)} ${top.name}` : 'N/A', top ? peso(top.total) : '—', t.purple, 180)}
        </View>

        {isCurrent && (
          <FadeInView delay={200}>
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
                    {peso(total)} of {peso(monthlyBudget)} · {(ratio * 100).toFixed(0)}% used
                  </Text>
                </>
              ) : (
                <Text style={{ color: t.textMuted, fontSize: 12 }}>
                  Set a limit and watch the bar fill up as you spend.
                </Text>
              )}
            </Pressable>
          </FadeInView>
        )}

        <FadeInView delay={260}>
          <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
            <View style={styles.row}>
              <Feather name="pie-chart" size={16} color={t.accent} />
              <Text style={[styles.cardTitle, { color: t.text }]}>Spending Breakdown</Text>
            </View>
            {categoryTotals.length === 0 ? (
              <Text style={{ color: t.textFaint, fontSize: 12, textAlign: 'center', paddingVertical: 12 }}>
                No spending in {monthLabel(month)}.
              </Text>
            ) : (
              categoryTotals.map((c, i) => (
                <View key={c.name} style={{ gap: 6 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: t.text, fontSize: 12, fontWeight: '500' }}>
                      {categoryIcon(c.name)} {c.name}
                    </Text>
                    <Text style={{ color: t.textMuted, fontSize: 12 }}>
                      {peso(c.total)} ({c.percentage.toFixed(0)}%)
                    </Text>
                  </View>
                  <AnimatedBar percent={c.percentage} color={t.accent} trackColor={t.border} delay={300 + i * 80} />
                </View>
              ))
            )}
          </View>
        </FadeInView>
      </View>

      <FadeInView delay={320}>
        <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
          <View style={styles.row}>
            <Feather name="hard-drive" size={16} color={t.accent} />
            <Text style={[styles.cardTitle, { color: t.text }]}>Your Data</Text>
          </View>
          <Text style={{ color: t.textMuted, fontSize: 12 }}>
            Data lives only on this phone. Back up to Google Drive or Files so you never lose it.
          </Text>
          <View style={styles.actions}>
            {action('upload-cloud', 'Backup', onBackup, t.accent)}
            {action('download-cloud', 'Restore', onRestore)}
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontWeight: '600', fontSize: 14 },
  actions: { flexDirection: 'row', gap: 8 },
  action: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
});
