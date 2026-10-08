import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { categoriesFor, Expense, isIncome, parseAmount } from '../expenses';
import { Theme } from '../theme';
import CategoryDropdown from './CategoryDropdown';

type Props = {
  theme: Theme;
  expense: Expense | null;
  onClose: () => void;
  onSave: (e: Expense) => void;
};

export default function EditModal({ theme, expense, onClose, onSave }: Props) {
  return (
    <Modal visible={expense != null} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        {/* Keyed so the form starts fresh from each expense being edited. */}
        {expense && <EditForm key={expense.id} theme={theme} expense={expense} onClose={onClose} onSave={onSave} />}
      </View>
    </Modal>
  );
}

function EditForm({ theme: t, expense, onClose, onSave }: Props & { expense: Expense }) {
  const [item, setItem] = useState(expense.item);
  const [amount, setAmount] = useState(expense.amount.toString());
  const [category, setCategory] = useState(expense.category);

  const parsed = parseAmount(amount);
  const canSave = item.trim().length > 0 && parsed != null;

  const save = () => {
    if (!canSave) return;
    onSave({ ...expense, item: item.trim(), amount: parsed, category });
  };

  const inputStyle = [styles.input, { backgroundColor: t.input, borderColor: t.border, color: t.text }];

  return (
    <View style={[styles.sheet, { backgroundColor: t.card, borderColor: t.border }]}>
      <View style={styles.header}>
        <Text style={{ color: t.text, fontWeight: '700', fontSize: 15 }}>{isIncome(expense) ? 'Edit Income' : 'Edit Expense'}</Text>
        <Pressable hitSlop={8} onPress={onClose}>
          <Feather name="x" size={18} color={t.textMuted} />
        </Pressable>
      </View>

      <Text style={[styles.label, { color: t.textMuted }]}>Item</Text>
      <TextInput value={item} onChangeText={setItem} style={inputStyle} />

      <Text style={[styles.label, { color: t.textMuted }]}>Amount (₱)</Text>
      <TextInput
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        style={[inputStyle, { fontWeight: '700', color: t.accent }]}
      />

      <Text style={[styles.label, { color: t.textMuted }]}>Category</Text>
      <CategoryDropdown theme={t} value={category} onChange={setCategory} options={categoriesFor(expense.kind ?? 'expense')} />

      <View style={styles.actions}>
        <Pressable onPress={onClose} style={[styles.btn, { borderColor: t.border, borderWidth: 1 }]}>
          <Text style={{ color: t.textMuted, fontWeight: '600' }}>Cancel</Text>
        </Pressable>
        <Pressable
          onPress={save}
          disabled={!canSave}
          style={[styles.btn, { backgroundColor: t.accent, opacity: canSave ? 1 : 0.5 }]}
        >
          <Text style={{ color: '#020617', fontWeight: '700' }}>Save Changes</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 16 },
  sheet: { borderRadius: 16, borderWidth: 1, padding: 18, gap: 6 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  label: { fontSize: 12, marginTop: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
});
