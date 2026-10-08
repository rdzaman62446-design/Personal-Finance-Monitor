import { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import { daysInMonth, Expense, isIncome, Month, peso } from '../expenses';
import { Theme } from '../theme';

const CHART_HEIGHT = 110;
const LABEL_DAYS = new Set([1, 5, 10, 15, 20, 25, 30]);

// Bar chart of spending per day for one month. Tap a bar to see that day's total.
export default function DailyChart({
  theme: t,
  expenses,
  month,
  today,
}: {
  theme: Theme;
  expenses: Expense[];
  month: Month;
  // Day of the month to highlight, or null for past months.
  today: number | null;
}) {
  const days = daysInMonth(month);
  const totals = useMemo(() => {
    const arr = new Array(days).fill(0);
    for (const e of expenses) if (!isIncome(e)) arr[new Date(e.timestamp).getDate() - 1] += e.amount;
    return arr as number[];
  }, [expenses, days]);
  const peak = Math.max(...totals);
  const max = peak || 1;
  const [selected, setSelected] = useState<number | null>(null);

  const label =
    selected != null
      ? `${new Date(month.year, month.month, selected).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: ${peso(totals[selected - 1])}`
      : peak > 0
        ? `Busiest day: ${peso(peak)} · tap a bar for details`
        : 'No spending this month';

  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: selected != null ? t.accent : t.textMuted, fontSize: 12, fontWeight: '600' }}>{label}</Text>
      <View style={[styles.chart, { height: CHART_HEIGHT }]}>
        {totals.map((v, i) => {
          const day = i + 1;
          const isToday = day === today;
          const isSelected = day === selected;
          const color = isSelected ? t.accent : isToday ? t.amber : v > 0 ? t.accent : t.border;
          return (
            <Pressable
              key={day}
              style={styles.slot}
              onPress={() => setSelected(isSelected ? null : day)}
              hitSlop={{ top: 10, bottom: 10 }}
            >
              <Bar ratio={v / max} color={color} faded={!isSelected && !isToday && selected != null} delay={i * 12} />
            </Pressable>
          );
        })}
      </View>
      <View style={styles.labels}>
        {totals.map((_, i) => (
          <Text key={i} style={[styles.label, { color: t.textFaint }]}>
            {LABEL_DAYS.has(i + 1) ? i + 1 : ''}
          </Text>
        ))}
      </View>
    </View>
  );
}

function Bar({ ratio, color, faded, delay }: { ratio: number; color: string; faded: boolean; delay: number }) {
  const [height] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(height, {
      // Days with no spending still show a small stub so the month's shape reads.
      toValue: Math.max(ratio * CHART_HEIGHT, 3),
      duration: 600,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [height, ratio, delay]);
  return <Animated.View style={[styles.bar, { height, backgroundColor: color, opacity: faded ? 0.35 : 1 }]} />;
}

const styles = StyleSheet.create({
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  slot: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  bar: { width: '100%', borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  labels: { flexDirection: 'row', gap: 2 },
  label: { flex: 1, fontSize: 9, textAlign: 'center' },
});
