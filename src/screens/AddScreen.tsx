import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, Vibration, View } from 'react-native';

import { CATEGORIES, categoryIcon, Expense, formatDate, formatDay, formatTime, parseAmount, peso } from '../expenses';
import { Theme } from '../theme';

type Props = {
  theme: Theme;
  expenses: Expense[];
  spentToday: number;
  totalSpent: number;
  onAdd: (e: Omit<Expense, 'id' | 'timestamp'>) => void;
  onViewAll: () => void;
};

export default function AddScreen({ theme: t, expenses, spentToday, totalSpent, onAdd, onViewAll }: Props) {
  const [item, setItem] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0].name);

  const parsed = parseAmount(amount);
  const canSubmit = item.trim().length > 0 && parsed != null;

  const submit = () => {
    if (!canSubmit) return;
    onAdd({ item: item.trim(), amount: parsed, category });
    setItem('');
    setAmount('');
    Vibration.vibrate(50);
  };

  return (
    <View style={{ gap: 16 }}>
      <View style={[styles.banner, { backgroundColor: t.card, borderColor: t.border }]}>
        <View>
          <Text style={[styles.small, { color: t.textMuted }]}>Today's Total</Text>
          <Text style={[styles.big, { color: t.accent }]}>{peso(spentToday)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.small, { color: t.textMuted }]}>All Time Total</Text>
          <Text style={[styles.medium, { color: t.text }]}>{peso(totalSpent)}</Text>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
        <View style={styles.row}>
          <Feather name="plus" size={16} color={t.accent} />
          <Text style={[styles.cardTitle, { color: t.text }]}>New Expense Entry</Text>
        </View>

        <Text style={[styles.label, { color: t.textMuted }]}>How much? (₱)</Text>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          placeholder="0.00"
          placeholderTextColor={t.textFaint}
          keyboardType="decimal-pad"
          style={[styles.amountInput, { backgroundColor: t.input, borderColor: t.border, color: t.text }]}
        />

        <Text style={[styles.label, { color: t.textMuted }]}>What did you spend on?</Text>
        <TextInput
          value={item}
          onChangeText={setItem}
          placeholder="e.g. Commute, Dinner, Groceries"
          placeholderTextColor={t.textFaint}
          returnKeyType="done"
          onSubmitEditing={submit}
          style={[styles.input, { backgroundColor: t.input, borderColor: t.border, color: t.text }]}
        />

        <Text style={[styles.label, { color: t.textMuted }]}>Category</Text>
        <View style={styles.grid}>
          {CATEGORIES.map((c) => {
            const active = c.name === category;
            return (
              <Pressable
                key={c.name}
                onPress={() => setCategory(c.name)}
                style={[
                  styles.chip,
                  {
                    borderColor: active ? t.accent : t.border,
                    backgroundColor: active ? t.accentSoft : t.input,
                  },
                ]}
              >
                <Text>{c.icon}</Text>
                <Text numberOfLines={1} style={[styles.chipText, { color: active ? t.accent : t.textMuted }]}>
                  {c.name}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={submit}
          disabled={!canSubmit}
          style={({ pressed }) => [
            styles.submit,
            { backgroundColor: t.accent, opacity: !canSubmit ? 0.5 : pressed ? 0.85 : 1 },
          ]}
        >
          <Feather name="plus" size={20} color="#020617" />
          <Text style={styles.submitText}>Add Expense</Text>
        </Pressable>
      </View>

      <View style={{ gap: 8 }}>
        <View style={[styles.row, { justifyContent: 'space-between' }]}>
          <Text style={[styles.sectionTitle, { color: t.textMuted }]}>RECENT LOGS</Text>
          <Pressable onPress={onViewAll}>
            <Text style={{ color: t.accent, fontSize: 12 }}>View All ({expenses.length})</Text>
          </Pressable>
        </View>
        {expenses.length === 0 && (
          <Text style={{ color: t.textFaint, fontSize: 12, textAlign: 'center', paddingVertical: 12 }}>
            No expenses yet. Add your first one above.
          </Text>
        )}
        {expenses.slice(0, 3).map((e) => (
          <View key={e.id} style={[styles.recent, { backgroundColor: t.card, borderColor: t.border }]}>
            <View style={[styles.row, { flex: 1 }]}>
              <Text style={{ fontSize: 18 }}>{categoryIcon(e.category)}</Text>
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={{ color: t.text, fontWeight: '700', fontSize: 13 }}>
                  {e.item}
                </Text>
                <Text style={{ color: t.textMuted, fontSize: 11 }}>
                  {formatTime(e.timestamp)} • {formatDate(e.timestamp)} ({formatDay(e.timestamp).slice(0, 3)})
                </Text>
              </View>
            </View>
            <Text style={{ color: t.accent, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
              {peso(e.amount)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  small: { fontSize: 12, fontWeight: '500' },
  big: { fontSize: 24, fontWeight: '800' },
  medium: { fontSize: 18, fontWeight: '700' },
  card: { padding: 18, borderRadius: 16, borderWidth: 1, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 14, fontWeight: '600' },
  label: { fontSize: 12, fontWeight: '500', marginTop: 8 },
  amountInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 24,
    fontWeight: '800',
  },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
  },
  chipText: { fontSize: 12, fontWeight: '500', flexShrink: 1 },
  submit: {
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  submitText: { color: '#020617', fontWeight: '700', fontSize: 16 },
  sectionTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  recent: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
});
