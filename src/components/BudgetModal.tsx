import { useEffect, useState } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { parseAmount } from '../expenses';
import { Theme } from '../theme';
import { PressableScale } from './motion';

type Props = {
  theme: Theme;
  visible: boolean;
  title: string;
  subtitle: string;
  current: number | null;
  onClose: () => void;
  onSave: (budget: number | null) => void;
};

// Bottom sheet for setting (or removing) a budget amount.
export default function BudgetModal(props: Props) {
  return (
    <Modal visible={props.visible} transparent animationType="fade" onRequestClose={props.onClose}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <Pressable style={styles.backdrop} onPress={props.onClose}>
          {/* Mounted only while open, so the input and slide-in reset each time. */}
          {props.visible && <BudgetSheet {...props} />}
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function BudgetSheet({ theme: t, title, subtitle, current, onSave }: Props) {
  const [text, setText] = useState(current ? current.toString() : '');
  const [slide] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(slide, {
      toValue: 1,
      duration: 320,
      easing: Easing.out(Easing.back(1.1)),
      useNativeDriver: true,
    }).start();
  }, [slide]);

  const parsed = parseAmount(text);
  const translateY = slide.interpolate({ inputRange: [0, 1], outputRange: [400, 0] });

  return (
    <Animated.View style={{ transform: [{ translateY }] }}>
      <Pressable style={[styles.sheet, { backgroundColor: t.card, borderColor: t.border }]}>
        <View style={[styles.handle, { backgroundColor: t.border }]} />
        <Text style={{ color: t.text, fontWeight: '700', fontSize: 17 }}>{title}</Text>
        <Text style={{ color: t.textMuted, fontSize: 12, marginBottom: 8 }}>{subtitle}</Text>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="e.g. 15000"
          placeholderTextColor={t.textFaint}
          keyboardType="decimal-pad"
          autoFocus
          style={[styles.input, { backgroundColor: t.input, borderColor: t.border, color: t.text }]}
        />
        <View style={styles.actions}>
          {current != null && (
            <PressableScale onPress={() => onSave(null)} style={[styles.btn, { borderColor: t.border, borderWidth: 1 }]}>
              <Text style={{ color: t.danger, fontWeight: '600' }}>Remove</Text>
            </PressableScale>
          )}
          <PressableScale
            onPress={() => parsed != null && onSave(parsed)}
            disabled={parsed == null}
            style={[styles.btn, { backgroundColor: t.accent, opacity: parsed == null ? 0.5 : 1 }]}
          >
            <Text style={{ color: '#020617', fontWeight: '700' }}>Save budget</Text>
          </PressableScale>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 20,
    paddingBottom: 32,
    gap: 6,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: 10 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 22, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
});
