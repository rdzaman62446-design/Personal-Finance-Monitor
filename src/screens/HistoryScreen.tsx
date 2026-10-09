import { Feather } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, Vibration, View } from 'react-native';

import { bareAmount, parseAmountQuery } from '../amountQuery';
import InnerHorizontalScroll from '../components/InnerHorizontalScroll';
import PeriodDropdown from '../components/PeriodDropdown';
import { AnimatedNumber, FadeInView, PressableScale } from '../components/motion';
import { categoriesFor, Expense, formatDate, formatDay, formatTime, isIncome, peso, totalIncome, totalSpent } from '../expenses';
import { logText, useLogFont } from '../fonts';
import { periodLabel, PeriodKey, periodRange } from '../periods';
import { Theme } from '../theme';

type Props = {
  theme: Theme;
  expenses: Expense[];
  // Current time, refreshed when the app returns to the foreground, so "Today" rolls over.
  now: number;
  onEdit: (e: Expense) => void;
  onDelete: (e: Expense) => void;
};

export default function HistoryScreen({ theme: t, expenses, now, onEdit, onDelete }: Props) {
  const font = useLogFont();
  const [period, setPeriod] = useState<PeriodKey>('today');
  const [start, end] = periodRange(period, now);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');

  // "over 500", "100-300", "<200"… filter by amount; anything else searches the text.
  const amountQuery = useMemo(() => parseAmountQuery(query), [query]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const exact = bareAmount(query);
    return expenses.filter((e) => {
      const matchesSearch = amountQuery
        ? amountQuery.test(e.amount)
        : e.item.toLowerCase().includes(q) ||
          formatDate(e.timestamp).toLowerCase().includes(q) ||
          formatDay(e.timestamp).toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q) ||
          (exact != null && Math.abs(e.amount - exact) < 0.005);
      const matchesFilter =
        filter === 'All' ||
        (filter === 'Expenses' && !isIncome(e)) ||
        (filter === 'Income' && isIncome(e)) ||
        e.category === filter;
      const inPeriod = e.timestamp >= start && e.timestamp < end;
      return inPeriod && matchesSearch && matchesFilter;
    });
  }, [expenses, query, filter, amountQuery, start, end]);

  const filteredSpent = totalSpent(filtered);
  const filteredIncome = totalIncome(filtered);

  const pill = (label: string, value: string) => {
    const active = filter === value;
    return (
      <PressableScale
        key={value}
        onPress={() => setFilter(value)}
        style={[styles.pill, { backgroundColor: active ? t.accent : t.card, borderColor: active ? t.accent : t.border }]}
      >
        <Text style={{ fontSize: 12, fontWeight: '500', color: active ? '#020617' : t.textMuted }}>{label}</Text>
      </PressableScale>
    );
  };

  return (
    <View style={{ gap: 12 }}>
      <FadeInView>
        <PeriodDropdown theme={t} value={period} now={now} onChange={setPeriod} />
      </FadeInView>

      <FadeInView delay={30}>
        <View style={[styles.search, { backgroundColor: t.card, borderColor: t.border }]}>
          <Feather name="search" size={16} color={t.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search text, or amount like >500 or 100-300"
            placeholderTextColor={t.textFaint}
            style={{ flex: 1, color: t.text, fontSize: 13, paddingVertical: 10 }}
          />
          {query.length > 0 && (
            <Pressable hitSlop={8} onPress={() => setQuery('')}>
              <Feather name="x-circle" size={16} color={t.textFaint} />
            </Pressable>
          )}
        </View>
      </FadeInView>

      {amountQuery && (
        <FadeInView from={-6}>
          <View style={[styles.amountChip, { backgroundColor: t.accentSoft }]}>
            <Feather name="filter" size={12} color={t.accent} />
            <Text style={{ color: t.accent, fontSize: 12, fontWeight: '700' }}>Amount {amountQuery.label}</Text>
          </View>
        </FadeInView>
      )}

      <FadeInView delay={60}>
        <InnerHorizontalScroll contentContainerStyle={{ gap: 6 }}>
          {pill('All', 'All')}
          {pill('💸 Expenses', 'Expenses')}
          {pill('💰 Income', 'Income')}
          {categoriesFor('expense').map((c) => pill(`${c.icon} ${c.name}`, c.name))}
        </InnerHorizontalScroll>
      </FadeInView>

      {filtered.length > 0 && (
        <Text style={{ color: t.textFaint, fontSize: 11, textAlign: 'center' }}>
          Tap a row to edit · Long-press to delete
        </Text>
      )}

      <View style={[styles.table, { backgroundColor: t.card, borderColor: t.border }]}>
        {filtered.length === 0 ? (
          <FadeInView style={{ alignItems: 'center', paddingVertical: 36, gap: 8 }}>
            <Feather name="inbox" size={28} color={t.textFaint} />
            <Text style={{ color: t.textFaint, fontSize: 13 }}>
              {expenses.length === 0
                ? 'Nothing recorded yet.'
                : query || filter !== 'All'
                  ? `Nothing matches in ${periodLabel(period).toLowerCase()}.`
                  : period === 'today'
                    ? 'Nothing logged today yet.'
                    : `Nothing logged ${period === 'yesterday' ? 'yesterday' : `in ${periodLabel(period).toLowerCase()}`}.`}
            </Text>
            {period !== 'all' && (
              <PressableScale onPress={() => setPeriod('all')} style={[styles.allBtn, { borderColor: t.accent }]}>
                <Text style={{ color: t.accent, fontSize: 12, fontWeight: '700' }}>Show all time</Text>
              </PressableScale>
            )}
          </FadeInView>
        ) : (
          filtered.map((e, i) => (
            <FadeInView key={e.id} delay={Math.min(i, 12) * 35}>
              <PressableScale
                scaleTo={0.97}
                onPress={() => onEdit(e)}
                onLongPress={() => {
                  Vibration.vibrate(30);
                  onDelete(e);
                }}
                delayLongPress={400}
              >
                <View style={[styles.rowItem, { borderBottomColor: t.border, backgroundColor: t.card }]}>
                  <View style={{ width: 82 }}>
                    <Text style={[logText(font, true, 12), { color: t.accent }]}>{formatTime(e.timestamp)}</Text>
                    <Text style={[logText(font, false, 11), { color: t.textMuted }]}>
                      {formatDate(e.timestamp)} • {formatDay(e.timestamp).slice(0, 3)}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[logText(font, true, 13), { color: t.text }]}>
                      {e.item}
                      {e.recurringId ? '  🔁' : ''}
                    </Text>
                    <Text style={[styles.tag, { color: t.textMuted, borderColor: t.border }]}>{e.category}</Text>
                  </View>
                  <Text
                    style={[logText(font, true, 14), { color: isIncome(e) ? t.income : t.accent, fontVariant: ['tabular-nums'] }]}
                  >
                    {isIncome(e) ? '+' : ''}
                    {peso(e.amount)}
                  </Text>
                </View>
              </PressableScale>
            </FadeInView>
          ))
        )}

        <View style={[styles.footer, { borderTopColor: t.accent, backgroundColor: t.cardAlt }]}>
          <View>
            <Text style={{ color: t.accent, fontWeight: '800', fontSize: 12, letterSpacing: 1 }}>TOTAL SPENT · {periodLabel(period).toUpperCase()}</Text>
            <Text style={{ color: t.textMuted, fontSize: 11 }}>{filtered.length} items</Text>
          </View>
          <AnimatedNumber value={filteredSpent} format={peso} style={{ color: t.accent, fontWeight: '800', fontSize: 16 }} />
        </View>
        {filteredIncome > 0 && (
          <View style={[styles.footer, styles.incomeFooter, { backgroundColor: t.cardAlt }]}>
            <Text style={{ color: t.income, fontWeight: '800', fontSize: 12, letterSpacing: 1 }}>TOTAL INCOME</Text>
            <AnimatedNumber
              value={filteredIncome}
              format={(n) => '+' + peso(n)}
              style={{ color: t.income, fontWeight: '800', fontSize: 16 }}
            />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12 },
  allBtn: { marginTop: 4, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  amountChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  table: { borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  rowItem: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  tag: {
    alignSelf: 'flex-start',
    marginTop: 4,
    fontSize: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderRadius: 4,
  },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderTopWidth: 2 },
  incomeFooter: { borderTopWidth: 0, paddingTop: 0 },
});
