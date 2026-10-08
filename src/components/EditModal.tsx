import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { CATEGORIES, Expense, parseAmount } from '../expenses';
import { Theme } from '../theme';

type Props = {
  theme: Theme;
  expense: Expense | null;
  onClose: () => void;
  onSave: (e: Expense) => void;
};

export default function EditModal({ theme: t, expense, onClose, onSave }: Props) {
  const [item, setItem] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0].name);

  useEffect(() => {
    if (!expense) return;
    setItem(expense.item);
    setAmount(expense.amount.toString());
    setCategory(expense.category);
  }, [expense]);

  const parsed = parseAmount(amount);
  const canSave = item.trim().length > 0 && parsed != null;

  const save = () => {
    if (!expense || !canSave) return;
    onSave({ ...expense, item: item.trim(), amount: parsed, category });
  };

  const inputStyle = [styles.input, { backgroundColor: t.input, borderColor: t.border, color: t.text }];

  return (
    <Modal visible={expense != null} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: t.card, borderColor: t.border }]}>
          <View style={styles.header}>
            <Text style={{ color: t.text, fontWeight: '700', fontSize: 15 }}>Edit Expense</Text>
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
          <View style={styles.grid}>
            {CATEGORIES.map((c) => {
              const active = c.name === category;
              return (
                <Pressable
                  key={c.name}
                  onPress={() => setCategory(c.name)}
                  style={[
                    styles.chip,
                    { borderColor: active ? t.accent : t.border, backgroundColor: active ? t.accentSoft : t.input },
                  ]}
                >
                  <Text numberOfLines={1} style={{ fontSize: 12, color: active ? t.accent : t.textMuted }}>
                    {c.icon} {c.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>

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
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 16 },
  sheet: { borderRadius: 16, borderWidth: 1, padding: 18, gap: 6 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  label: { fontSize: 12, marginTop: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { width: '48.5%', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
});
