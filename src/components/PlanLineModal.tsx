import { useEffect, useState } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { parseAmount } from '../expenses';
import { PlanLine } from '../forecast';
import { WEEKDAYS } from '../incomeSources';
import { tidyText } from '../tidy';
import { Theme } from '../theme';
import { PressableScale } from './motion';

type Props = {
  theme: Theme;
  visible: boolean;
  // The line being edited, or a { kind } template for a new one.
  line: PlanLine | { kind: PlanLine['kind'] } | null;
  onClose: () => void;
  onSave: (line: PlanLine) => void;
  onDelete: (line: PlanLine) => void;
};

// Bottom sheet to add or edit a Forecast line (salary, rent, utilities…).
export default function PlanLineModal(props: Props) {
  return (
    <Modal visible={props.visible} transparent animationType="fade" onRequestClose={props.onClose}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <Pressable style={styles.backdrop} onPress={props.onClose}>
          {props.visible && props.line && <Sheet {...props} line={props.line} />}
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Sheet({ theme: t, line, onSave, onDelete }: Props & { line: NonNullable<Props['line']> }) {
  const existing = 'id' in line ? line : null;
  const [kind, setKind] = useState<PlanLine['kind']>(line.kind);
  const [name, setName] = useState(existing?.name ?? '');
  const [amount, setAmount] = useState(existing ? existing.amount.toString() : '');
  const [weekly, setWeekly] = useState(existing?.weekday != null);
  const [weekday, setWeekday] = useState(existing?.weekday ?? 5);
  const [slide] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(slide, { toValue: 1, duration: 320, easing: Easing.out(Easing.back(1.1)), useNativeDriver: true }).start();
  }, [slide]);

  const parsed = parseAmount(amount);
  const canSave = tidyText(name).length > 0 && parsed != null;
  const tint = kind === 'income' ? t.income : t.danger;
  const translateY = slide.interpolate({ inputRange: [0, 1], outputRange: [600, 0] });
  const inputStyle = [styles.input, { backgroundColor: t.input, borderColor: t.border, color: t.text }];

  const save = () => {
    if (!canSave) return;
    onSave({
      ...(existing ?? {}),
      id: existing?.id ?? `plan-${Date.now().toString(36)}`,
      name: tidyText(name),
      amount: parsed,
      kind,
      weekday: weekly ? weekday : null,
    });
  };

  const segment = <T,>(options: [T, string][], value: T, set: (v: T) => void, color: string) => (
    <View style={[styles.segments, { borderColor: t.border, backgroundColor: t.input }]}>
      {options.map(([v, label]) => (
        <Pressable key={label} onPress={() => set(v)} style={[styles.segment, v === value && { backgroundColor: color }]}>
          <Text style={{ color: v === value ? '#020617' : t.textMuted, fontWeight: '700', fontSize: 13 }}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );

  return (
    <Animated.View style={{ transform: [{ translateY }] }}>
      <Pressable style={[styles.sheet, { backgroundColor: t.card, borderColor: t.border }]}>
        <View style={[styles.handle, { backgroundColor: t.border }]} />
        <Text style={{ color: t.text, fontWeight: '700', fontSize: 17 }}>{existing ? 'Edit line' : 'New forecast line'}</Text>
        {segment<PlanLine['kind']>([['income', 'Income'], ['expense', 'Expense']], kind, setKind, tint)}

        <Text style={[styles.label, { color: t.textMuted }]}>Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={kind === 'income' ? 'e.g. 15th pay, Job B' : 'e.g. Rent, Utilities, Misc'}
          placeholderTextColor={t.textFaint}
          style={inputStyle}
        />

        <Text style={[styles.label, { color: t.textMuted }]}>{weekly ? 'Amount per payday (₱)' : 'Usual amount per month (₱)'}</Text>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          placeholder="0"
          placeholderTextColor={t.textFaint}
          keyboardType="decimal-pad"
          style={[inputStyle, { fontWeight: '700', fontSize: 18 }]}
        />

        <Text style={[styles.label, { color: t.textMuted }]}>Repeats</Text>
        {segment<boolean>([[false, 'Monthly'], [true, 'Weekly']], weekly, setWeekly, tint)}
        {weekly && (
          <View style={styles.weekdays}>
            {WEEKDAYS.map((d, i) => (
              <PressableScale
                key={d}
                onPress={() => setWeekday(i)}
                style={[styles.weekday, { borderColor: weekday === i ? tint : t.border, backgroundColor: t.input }]}
              >
                <Text style={{ color: weekday === i ? tint : t.textMuted, fontWeight: '700', fontSize: 12 }}>{d}</Text>
              </PressableScale>
            ))}
          </View>
        )}
        {weekly && <Text style={{ color: t.textFaint, fontSize: 11 }}>Each month counts its actual {WEEKDAYS[weekday]}days (4 or 5).</Text>}

        <View style={[styles.actions, { marginTop: 12 }]}>
          {existing && (
            <PressableScale onPress={() => onDelete(existing)} style={[styles.btn, { borderColor: t.border, borderWidth: 1 }]}>
              <Text style={{ color: t.danger, fontWeight: '600' }}>Delete</Text>
            </PressableScale>
          )}
          <PressableScale onPress={save} disabled={!canSave} style={[styles.btn, { backgroundColor: tint, opacity: canSave ? 1 : 0.5 }]}>
            <Text style={{ color: '#020617', fontWeight: '700' }}>Save</Text>
          </PressableScale>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, padding: 20, paddingBottom: 32, gap: 6 },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: 6 },
  label: { fontSize: 12, fontWeight: '500', marginTop: 6 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14 },
  segments: { flexDirection: 'row', padding: 4, borderRadius: 12, borderWidth: 1 },
  segment: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 9 },
  weekdays: { flexDirection: 'row', gap: 6 },
  weekday: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  actions: { flexDirection: 'row', gap: 8 },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
});
