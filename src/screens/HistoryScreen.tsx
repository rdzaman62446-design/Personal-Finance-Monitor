import { Feather } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { CATEGORIES, Expense, formatDate, formatDay, formatTime, peso } from '../expenses';
import { Theme } from '../theme';

type Props = {
  theme: Theme;
  expenses: Expense[];
  onEdit: (e: Expense) => void;
  onDelete: (id: string) => void;
};

export default function HistoryScreen({ theme: t, expenses, onEdit, onDelete }: Props) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return expenses.filter((e) => {
      const matchesSearch =
        e.item.toLowerCase().includes(q) ||
        formatDate(e.timestamp).toLowerCase().includes(q) ||
        formatDay(e.timestamp).toLowerCase().includes(q);
      return matchesSearch && (filter === 'All' || e.category === filter);
    });
  }, [expenses, query, filter]);

  const filteredTotal = filtered.reduce((sum, e) => sum + e.amount, 0);

  const confirmDelete = (e: Expense) =>
    Alert.alert('Delete expense?', `${e.item} (${peso(e.amount)})`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => onDelete(e.id) },
    ]);

  const pill = (label: string, value: string) => {
    const active = filter === value;
    return (
      <Pressable
        key={value}
        onPress={() => setFilter(value)}
        style={[
          styles.pill,
          { backgroundColor: active ? t.accent : t.card, borderColor: active ? t.accent : t.border },
        ]}
      >
        <Text style={{ fontSize: 12, fontWeight: '500', color: active ? '#020617' : t.textMuted }}>{label}</Text>
      </Pressable>
    );
  };

  return (
    <View style={{ gap: 12 }}>
      <View style={[styles.search, { backgroundColor: t.card, borderColor: t.border }]}>
        <Feather name="search" size={16} color={t.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search item, date, or day..."
          placeholderTextColor={t.textFaint}
          style={{ flex: 1, color: t.text, fontSize: 13, paddingVertical: 10 }}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        {pill('All Categories', 'All')}
        {CATEGORIES.map((c) => pill(`${c.icon} ${c.name}`, c.name))}
      </ScrollView>

      <View style={[styles.table, { backgroundColor: t.card, borderColor: t.border }]}>
        {filtered.length === 0 ? (
          <Text style={{ color: t.textFaint, textAlign: 'center', paddingVertical: 32, fontSize: 13 }}>
            No expenses recorded yet.
          </Text>
        ) : (
          filtered.map((e) => (
            <View key={e.id} style={[styles.rowItem, { borderBottomColor: t.border }]}>
              <View style={{ width: 82 }}>
                <Text style={{ color: t.accent, fontWeight: '600', fontSize: 12 }}>{formatTime(e.timestamp)}</Text>
                <Text style={{ color: t.textMuted, fontSize: 11 }}>
                  {formatDate(e.timestamp)} • {formatDay(e.timestamp).slice(0, 3)}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: t.text, fontWeight: '600', fontSize: 13 }}>{e.item}</Text>
                <Text style={[styles.tag, { color: t.textMuted, borderColor: t.border }]}>{e.category}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <Text style={{ color: t.accent, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
                  {peso(e.amount)}
                </Text>
                <View style={{ flexDirection: 'row', gap: 14 }}>
                  <Pressable hitSlop={8} onPress={() => onEdit(e)}>
                    <Feather name="edit-3" size={16} color={t.textMuted} />
                  </Pressable>
                  <Pressable hitSlop={8} onPress={() => confirmDelete(e)}>
                    <Feather name="trash-2" size={16} color={t.danger} />
                  </Pressable>
                </View>
              </View>
            </View>
          ))
        )}

        <View style={[styles.footer, { borderTopColor: t.accent, backgroundColor: t.cardAlt }]}>
          <View>
            <Text style={{ color: t.accent, fontWeight: '800', fontSize: 12, letterSpacing: 1 }}>TOTAL SPENT</Text>
            <Text style={{ color: t.textMuted, fontSize: 11 }}>Filtered Count: {filtered.length} items</Text>
          </View>
          <Text style={{ color: t.accent, fontWeight: '800', fontSize: 16 }}>{peso(filteredTotal)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  table: { borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  rowItem: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tag: {
    alignSelf: 'flex-start',
    marginTop: 4,
    fontSize: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderRadius: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 2,
  },
});
