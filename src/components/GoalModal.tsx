import { Feather } from '@expo/vector-icons';
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

import { Month, monthKey, monthLabel, monthOf, parseAmount, parseMonthKey, peso, shiftMonth } from '../expenses';
import { Goal } from '../goals';
import { tidyText } from '../tidy';
import { Theme } from '../theme';
import { AnimatedBar, PressableScale } from './motion';

type Props = {
  theme: Theme;
  visible: boolean;
  // The goal being edited, or null to create one.
  goal: Goal | null;
  onClose: () => void;
  onSave: (goal: Goal) => void;
  // Positive to add money, negative to withdraw.
  onMoveMoney: (goal: Goal, delta: number) => void;
  onDelete: (goal: Goal) => void;
};

// Bottom sheet to create or edit a savings goal and add/withdraw money.
export default function GoalModal(props: Props) {
  return (
    <Modal visible={props.visible} transparent animationType="fade" onRequestClose={props.onClose}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <Pressable style={styles.backdrop} onPress={props.onClose}>
          {props.visible && <Sheet key={props.goal?.id ?? 'new'} {...props} />}
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Sheet({ theme: t, goal, onSave, onMoveMoney, onDelete }: Props) {
  const [thisMonth] = useState(() => monthOf(Date.now()));
  const [name, setName] = useState(goal?.name ?? '');
  const [icon, setIcon] = useState(goal?.icon ?? '');
  const [target, setTarget] = useState(goal ? goal.target.toString() : '');
  const [deadline, setDeadline] = useState<Month | null>(goal?.deadline ? parseMonthKey(goal.deadline) : null);
  const [move, setMove] = useState('');
  const [slide] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(slide, { toValue: 1, duration: 320, easing: Easing.out(Easing.back(1.1)), useNativeDriver: true }).start();
  }, [slide]);

  const parsedTarget = parseAmount(target);
  const parsedMove = parseAmount(move);
  const canSave = tidyText(name).length > 0 && parsedTarget != null;

  const save = () => {
    if (!canSave) return;
    onSave({
      id: goal?.id ?? Date.now().toString(36),
      name: tidyText(name),
      icon: Array.from(icon.trim())[0] ?? '🎯',
      target: parsedTarget,
      saved: goal?.saved ?? 0,
      deadline: deadline ? monthKey(deadline) : null,
    });
  };

  const inputStyle = [styles.input, { backgroundColor: t.input, borderColor: t.border, color: t.text }];
  const translateY = slide.interpolate({ inputRange: [0, 1], outputRange: [700, 0] });
  const atFirstMonth = deadline != null && deadline.year === thisMonth.year && deadline.month === thisMonth.month;

  return (
    <Animated.View style={{ transform: [{ translateY }], maxHeight: '92%' }}>
      <Pressable style={[styles.sheet, { backgroundColor: t.card, borderColor: t.border }]}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 8 }}>
          <View style={[styles.handle, { backgroundColor: t.border }]} />
          <Text style={{ color: t.text, fontWeight: '700', fontSize: 17 }}>{goal ? `${goal.icon} ${goal.name}` : 'New savings goal'}</Text>

          {goal && (
            <View style={[styles.moveBox, { backgroundColor: t.cardAlt, borderColor: t.border }]}>
              <Text style={{ color: t.textMuted, fontSize: 12 }}>
                Saved <Text style={{ color: t.accent, fontWeight: '800' }}>{peso(goal.saved)}</Text> of {peso(goal.target)}
              </Text>
              <AnimatedBar percent={(goal.saved / goal.target) * 100} color={t.accent} trackColor={t.border} height={10} />
              <TextInput
                value={move}
                onChangeText={setMove}
                placeholder="Amount (₱)"
                placeholderTextColor={t.textFaint}
                keyboardType="decimal-pad"
                style={[inputStyle, { fontWeight: '700', fontSize: 18 }]}
              />
              <View style={styles.actions}>
                <PressableScale
                  disabled={parsedMove == null || goal.saved <= 0}
                  onPress={() => {
                    if (parsedMove == null) return;
                    onMoveMoney(goal, -Math.min(parsedMove, goal.saved));
                    setMove('');
                  }}
                  style={[styles.btn, { borderColor: t.border, borderWidth: 1, opacity: parsedMove != null && goal.saved > 0 ? 1 : 0.5 }]}
                >
                  <Feather name="minus" size={16} color={t.text} />
                  <Text style={{ color: t.text, fontWeight: '600' }}>Withdraw</Text>
                </PressableScale>
                <PressableScale
                  disabled={parsedMove == null}
                  onPress={() => {
                    if (parsedMove == null) return;
                    onMoveMoney(goal, parsedMove);
                    setMove('');
                  }}
                  style={[styles.btn, { backgroundColor: t.accent, opacity: parsedMove != null ? 1 : 0.5 }]}
                >
                  <Feather name="plus" size={16} color="#020617" />
                  <Text style={{ color: '#020617', fontWeight: '700' }}>Add money</Text>
                </PressableScale>
              </View>
            </View>
          )}

          <Text style={[styles.label, { color: t.textMuted }]}>Goal</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              value={icon}
              onChangeText={setIcon}
              placeholder="🎯"
              placeholderTextColor={t.textFaint}
              maxLength={8}
              style={[inputStyle, { width: 56, textAlign: 'center', fontSize: 18 }]}
            />
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. New phone, Emergency fund"
              placeholderTextColor={t.textFaint}
              style={[inputStyle, { flex: 1 }]}
            />
          </View>

          <Text style={[styles.label, { color: t.textMuted }]}>Target amount (₱)</Text>
          <TextInput
            value={target}
            onChangeText={setTarget}
            placeholder="25000"
            placeholderTextColor={t.textFaint}
            keyboardType="decimal-pad"
            style={[inputStyle, { fontWeight: '700', fontSize: 18 }]}
          />

          <Text style={[styles.label, { color: t.textMuted }]}>Deadline (optional)</Text>
          {deadline ? (
            <View style={[styles.monthRow, { backgroundColor: t.input, borderColor: t.border }]}>
              <Pressable hitSlop={10} disabled={atFirstMonth} onPress={() => setDeadline(shiftMonth(deadline, -1))}>
                <Feather name="chevron-left" size={20} color={atFirstMonth ? t.border : t.text} />
              </Pressable>
              <Text style={{ flex: 1, textAlign: 'center', color: t.text, fontWeight: '700' }}>{monthLabel(deadline)}</Text>
              <Pressable hitSlop={10} onPress={() => setDeadline(shiftMonth(deadline, 1))}>
                <Feather name="chevron-right" size={20} color={t.text} />
              </Pressable>
              <Pressable hitSlop={10} onPress={() => setDeadline(null)} style={{ marginLeft: 8 }}>
                <Feather name="x" size={18} color={t.textFaint} />
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={() => setDeadline(shiftMonth(thisMonth, 6))}
              style={[styles.monthRow, { borderColor: t.border, borderStyle: 'dashed' }]}
            >
              <Feather name="calendar" size={16} color={t.accent} />
              <Text style={{ color: t.accent, fontWeight: '600', fontSize: 13 }}>Set a target month</Text>
            </Pressable>
          )}

          <View style={[styles.actions, { marginTop: 12 }]}>
            {goal && (
              <PressableScale onPress={() => onDelete(goal)} style={[styles.btn, { borderColor: t.border, borderWidth: 1 }]}>
                <Text style={{ color: t.danger, fontWeight: '600' }}>Delete</Text>
              </PressableScale>
            )}
            <PressableScale
              onPress={save}
              disabled={!canSave}
              style={[styles.btn, { backgroundColor: goal ? t.cardAlt : t.accent, borderWidth: goal ? 1 : 0, borderColor: t.border, opacity: canSave ? 1 : 0.5 }]}
            >
              <Text style={{ color: goal ? t.text : '#020617', fontWeight: '700' }}>{goal ? 'Save changes' : 'Create goal'}</Text>
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
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2 },
  label: { fontSize: 12, fontWeight: '500', marginTop: 6 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14 },
  moveBox: { gap: 8, padding: 12, borderRadius: 14, borderWidth: 1 },
  actions: { flexDirection: 'row', gap: 8 },
  btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, borderRadius: 12 },
  monthRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
});
