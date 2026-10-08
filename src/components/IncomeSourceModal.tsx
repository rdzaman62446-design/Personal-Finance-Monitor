import { useEffect, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { INCOME_CATEGORIES, parseAmount } from '../expenses';
import { IncomeSource, WEEKDAYS } from '../incomeSources';
import { Theme } from '../theme';
import CategoryDropdown from './CategoryDropdown';
import { PressableScale } from './motion';

type Props = {
  theme: Theme;
  visible: boolean;
  // The source being edited, or null to create a new one.
  source: IncomeSource | null;
  onClose: () => void;
  onSave: (source: IncomeSource) => void;
  onDelete: (source: IncomeSource) => void;
};

// Bottom sheet for adding or editing a saved income source (e.g. "Job A – 15th pay").
export default function IncomeSourceModal(props: Props) {
  return (
    <Modal visible={props.visible} transparent animationType="fade" onRequestClose={props.onClose}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <Pressable style={styles.backdrop} onPress={props.onClose}>
          {props.visible && <SourceSheet key={props.source?.id ?? 'new'} {...props} />}
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function SourceSheet({ theme: t, source, onSave, onDelete }: Props) {
  const [name, setName] = useState(source?.name ?? '');
  const [amount, setAmount] = useState(source ? source.amount.toString() : '');
  const [category, setCategory] = useState(source?.category ?? INCOME_CATEGORIES[0].name);
  const [frequency, setFrequency] = useState<IncomeSource['frequency']>(source?.frequency ?? 'monthly');
  const [monthDay, setMonthDay] = useState(source?.frequency === 'monthly' ? source.day.toString() : '15');
  const [weekday, setWeekday] = useState(source?.frequency === 'weekly' ? source.day : 5);
  const [slide] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(slide, { toValue: 1, duration: 320, easing: Easing.out(Easing.back(1.1)), useNativeDriver: true }).start();
  }, [slide]);

  const parsed = parseAmount(amount);
  const day = parseInt(monthDay, 10);
  const dayOk = frequency === 'weekly' || (day >= 1 && day <= 31);
  const canSave = name.trim().length > 0 && parsed != null && dayOk;

  const save = () => {
    if (!canSave) return;
    onSave({
      id: source?.id ?? Date.now().toString(36),
      name: name.trim(),
      amount: parsed,
      category,
      frequency,
      day: frequency === 'monthly' ? day : weekday,
    });
  };

  const inputStyle = [styles.input, { backgroundColor: t.input, borderColor: t.border, color: t.text }];
  const translateY = slide.interpolate({ inputRange: [0, 1], outputRange: [600, 0] });

  const segment = (value: IncomeSource['frequency'], label: string) => {
    const active = frequency === value;
    return (
      <Pressable
        key={value}
        onPress={() => setFrequency(value)}
        style={[styles.segment, { backgroundColor: active ? t.income : 'transparent' }]}
      >
        <Text style={{ color: active ? '#020617' : t.textMuted, fontWeight: '700', fontSize: 13 }}>{label}</Text>
      </Pressable>
    );
  };

  return (
    <Animated.View style={{ transform: [{ translateY }], maxHeight: '92%' }}>
      <Pressable style={[styles.sheet, { backgroundColor: t.card, borderColor: t.border }]}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 6 }}>
          <View style={[styles.handle, { backgroundColor: t.border }]} />
          <Text style={{ color: t.text, fontWeight: '700', fontSize: 17 }}>{source ? 'Edit income source' : 'New income source'}</Text>
          <Text style={{ color: t.textMuted, fontSize: 12 }}>
            Save a regular income once, then pick it from the list whenever you get paid.
          </Text>

          <Text style={[styles.label, { color: t.textMuted }]}>Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Job A – 15th pay"
            placeholderTextColor={t.textFaint}
            style={inputStyle}
          />

          <Text style={[styles.label, { color: t.textMuted }]}>Usual amount (₱)</Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            placeholder="15000"
            placeholderTextColor={t.textFaint}
            keyboardType="decimal-pad"
            style={[inputStyle, { fontWeight: '700', fontSize: 18 }]}
          />

          <Text style={[styles.label, { color: t.textMuted }]}>Category</Text>
          <CategoryDropdown theme={t} value={category} onChange={setCategory} options={INCOME_CATEGORIES} />

          <Text style={[styles.label, { color: t.textMuted }]}>How often?</Text>
          <View style={[styles.segments, { borderColor: t.border, backgroundColor: t.input }]}>
            {segment('monthly', 'Monthly')}
            {segment('weekly', 'Weekly')}
          </View>

          {frequency === 'monthly' ? (
            <>
              <Text style={[styles.label, { color: t.textMuted }]}>Day of the month (1–31)</Text>
              <TextInput
                value={monthDay}
                onChangeText={(v) => setMonthDay(v.replace(/[^0-9]/g, '').slice(0, 2))}
                keyboardType="number-pad"
                style={[inputStyle, !dayOk && { borderColor: t.danger }]}
              />
              <Text style={{ color: t.textFaint, fontSize: 11 }}>
                Use 30 or 31 for end-of-month pay — short months use their last day.
              </Text>
            </>
          ) : (
            <>
              <Text style={[styles.label, { color: t.textMuted }]}>Pay day</Text>
              <View style={styles.weekdays}>
                {WEEKDAYS.map((d, i) => {
                  const active = weekday === i;
                  return (
                    <PressableScale
                      key={d}
                      onPress={() => setWeekday(i)}
                      style={[
                        styles.weekday,
                        { borderColor: active ? t.income : t.border, backgroundColor: active ? t.incomeSoft : t.input },
                      ]}
                    >
                      <Text style={{ color: active ? t.income : t.textMuted, fontWeight: '700', fontSize: 12 }}>{d}</Text>
                    </PressableScale>
                  );
                })}
              </View>
            </>
          )}

          <View style={styles.actions}>
            {source && (
              <PressableScale onPress={() => onDelete(source)} style={[styles.btn, { borderColor: t.border, borderWidth: 1 }]}>
                <Text style={{ color: t.danger, fontWeight: '600' }}>Delete</Text>
              </PressableScale>
            )}
            <PressableScale
              onPress={save}
              disabled={!canSave}
              style={[styles.btn, { backgroundColor: t.income, opacity: canSave ? 1 : 0.5 }]}
            >
              <Text style={{ color: '#020617', fontWeight: '700' }}>Save</Text>
            </PressableScale>
          </View>
        </ScrollView>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, padding: 20, paddingBottom: 32 },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: 6 },
  label: { fontSize: 12, fontWeight: '500', marginTop: 8 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14 },
  segments: { flexDirection: 'row', padding: 4, borderRadius: 12, borderWidth: 1 },
  segment: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 9 },
  weekdays: { flexDirection: 'row', gap: 6 },
  weekday: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 16 },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
});
