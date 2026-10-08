import { Feather } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { categoryIcon, Expense, peso } from '../expenses';
import { Theme } from '../theme';

type Props = {
  theme: Theme;
  expenses: Expense[];
  spentToday: number;
  totalSpent: number;
  onClear: () => void;
};

export default function StatsScreen({ theme: t, expenses, spentToday, totalSpent, onClear }: Props) {
  const average = expenses.length ? totalSpent / expenses.length : 0;

  const categoryTotals = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of expenses) map[e.category] = (map[e.category] ?? 0) + e.amount;
    return Object.entries(map)
      .map(([name, total]) => ({ name, total, percentage: totalSpent > 0 ? (total / totalSpent) * 100 : 0 }))
      .sort((a, b) => b.total - a.total);
  }, [expenses, totalSpent]);

  const top = categoryTotals[0];
  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit' });

  const stat = (label: string, value: string, sub: string, color: string) => (
    <View style={[styles.stat, { backgroundColor: t.card, borderColor: t.border }]}>
      <Text style={{ color: t.textMuted, fontSize: 12, fontWeight: '500' }}>{label}</Text>
      <Text numberOfLines={1} style={{ color, fontSize: 18, fontWeight: '800', marginTop: 4 }}>
        {value}
      </Text>
      <Text style={{ color: t.textFaint, fontSize: 11, marginTop: 4 }}>{sub}</Text>
    </View>
  );

  const confirmClear = () =>
    Alert.alert('Delete all expenses?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear Data', style: 'destructive', onPress: onClear },
    ]);

  return (
    <View style={{ gap: 16 }}>
      <View style={styles.grid}>
        {stat('Spent Today', peso(spentToday), today, t.accent)}
        {stat('All Time Total', peso(totalSpent), `${expenses.length} Total Entries`, t.text)}
        {stat('Average Expense', peso(average), 'Per transaction', t.amber)}
        {stat('Top Category', top ? top.name : 'N/A', top ? peso(top.total) : '—', t.purple)}
      </View>

      <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Feather name="pie-chart" size={16} color={t.accent} />
          <Text style={{ color: t.text, fontWeight: '600', fontSize: 14 }}>Spending Breakdown</Text>
        </View>
        {categoryTotals.length === 0 ? (
          <Text style={{ color: t.textFaint, fontSize: 12, textAlign: 'center', paddingVertical: 12 }}>
            No data available yet.
          </Text>
        ) : (
          categoryTotals.map((c) => (
            <View key={c.name} style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: t.text, fontSize: 12, fontWeight: '500' }}>
                  {categoryIcon(c.name)} {c.name}
                </Text>
                <Text style={{ color: t.textMuted, fontSize: 12 }}>
                  {peso(c.total)} ({c.percentage.toFixed(0)}%)
                </Text>
              </View>
              <View style={[styles.barTrack, { backgroundColor: t.border }]}>
                <View style={[styles.barFill, { width: `${c.percentage}%`, backgroundColor: t.accent }]} />
              </View>
            </View>
          ))
        )}
      </View>

      <View style={[styles.clear, { backgroundColor: t.card, borderColor: t.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: t.text, fontWeight: '700', fontSize: 13 }}>Reset / Clear Log</Text>
          <Text style={{ color: t.textMuted, fontSize: 11 }}>Deletes all saved transactions on this phone</Text>
        </View>
        <Pressable onPress={confirmClear} style={[styles.clearBtn, { backgroundColor: t.dangerSoft }]}>
          <Text style={{ color: t.danger, fontWeight: '600', fontSize: 12 }}>Clear Data</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  stat: { width: '47.5%', flexGrow: 1, padding: 16, borderRadius: 16, borderWidth: 1 },
  card: { padding: 18, borderRadius: 16, borderWidth: 1, gap: 14 },
  barTrack: { height: 8, borderRadius: 999, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 999 },
  clear: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  clearBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
});
