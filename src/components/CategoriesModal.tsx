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

import { categoriesFor, CustomCategory, isBuiltInCategory, Kind } from '../expenses';
import { tidyText } from '../tidy';
import { Theme } from '../theme';
import { PressableScale } from './motion';

const SWATCHES = ['#f97316', '#eab308', '#22c55e', '#06b6d4', '#6366f1', '#ec4899', '#a16207', '#64748b'];

type Props = {
  theme: Theme;
  visible: boolean;
  custom: CustomCategory[];
  onClose: () => void;
  onAdd: (category: CustomCategory) => void;
  onDelete: (category: CustomCategory) => void;
};

// Lists every category and lets the user add or remove their own.
export default function CategoriesModal(props: Props) {
  return (
    <Modal visible={props.visible} transparent animationType="fade" onRequestClose={props.onClose}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <Pressable style={styles.backdrop} onPress={props.onClose}>
          {props.visible && <Sheet {...props} />}
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Sheet({ theme: t, custom, onAdd, onDelete }: Props) {
  const [kind, setKind] = useState<Kind>('expense');
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');
  const [color, setColor] = useState(SWATCHES[0]);
  const [slide] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(slide, { toValue: 1, duration: 320, easing: Easing.out(Easing.back(1.1)), useNativeDriver: true }).start();
  }, [slide]);

  const clean = tidyText(name);
  const taken = [...categoriesFor('expense'), ...categoriesFor('income')].some(
    (c) => c.name.toLowerCase() === clean.toLowerCase(),
  );
  const canAdd = clean.length > 0 && !taken;

  const add = () => {
    if (!canAdd) return;
    // Keep just the first emoji/character typed.
    const emoji = Array.from(icon.trim())[0] ?? '🏷️';
    onAdd({ name: clean, icon: emoji, color, kind });
    setName('');
    setIcon('');
  };

  const translateY = slide.interpolate({ inputRange: [0, 1], outputRange: [700, 0] });
  const list = categoriesFor(kind);

  return (
    <Animated.View style={{ transform: [{ translateY }], maxHeight: '92%' }}>
      <Pressable style={[styles.sheet, { backgroundColor: t.card, borderColor: t.border }]}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 10 }}>
          <View style={[styles.handle, { backgroundColor: t.border }]} />
          <Text style={{ color: t.text, fontWeight: '700', fontSize: 17 }}>Categories</Text>

          <View style={[styles.segments, { borderColor: t.border, backgroundColor: t.input }]}>
            {(['expense', 'income'] as Kind[]).map((k) => {
              const active = kind === k;
              const tint = k === 'income' ? t.income : t.accent;
              return (
                <Pressable key={k} onPress={() => setKind(k)} style={[styles.segment, active && { backgroundColor: tint }]}>
                  <Text style={{ color: active ? '#020617' : t.textMuted, fontWeight: '700', fontSize: 13 }}>
                    {k === 'income' ? 'Income' : 'Expense'}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={{ gap: 2 }}>
            {list.map((c) => {
              const builtIn = isBuiltInCategory(c.name);
              const own = custom.find((x) => x.name === c.name);
              return (
                <View key={c.name} style={[styles.row, { borderColor: t.border }]}>
                  <View style={[styles.swatch, { backgroundColor: c.color }]} />
                  <Text style={{ fontSize: 16 }}>{c.icon}</Text>
                  <Text style={{ flex: 1, color: t.text, fontSize: 14 }}>{c.name}</Text>
                  {builtIn ? (
                    <Feather name="lock" size={14} color={t.textFaint} />
                  ) : own ? (
                    <Pressable hitSlop={10} onPress={() => onDelete(own)}>
                      <Feather name="trash-2" size={16} color={t.danger} />
                    </Pressable>
                  ) : null}
                </View>
              );
            })}
          </View>

          <Text style={[styles.label, { color: t.textMuted }]}>Add a {kind} category</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              value={icon}
              onChangeText={setIcon}
              placeholder="🏷️"
              placeholderTextColor={t.textFaint}
              maxLength={8}
              style={[styles.input, styles.emojiInput, { backgroundColor: t.input, borderColor: t.border, color: t.text }]}
            />
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={kind === 'income' ? 'e.g. Rental income' : 'e.g. Pets, Debt, Gifts'}
              placeholderTextColor={t.textFaint}
              style={[styles.input, { flex: 1, backgroundColor: t.input, borderColor: taken ? t.danger : t.border, color: t.text }]}
            />
          </View>
          {taken && <Text style={{ color: t.danger, fontSize: 11 }}>That category already exists.</Text>}
          <View style={styles.swatches}>
            {SWATCHES.map((c) => (
              <Pressable
                key={c}
                onPress={() => setColor(c)}
                style={[styles.swatchBtn, { backgroundColor: c, borderColor: color === c ? t.text : 'transparent' }]}
              />
            ))}
          </View>
          <PressableScale
            onPress={add}
            disabled={!canAdd}
            style={[styles.btn, { backgroundColor: kind === 'income' ? t.income : t.accent, opacity: canAdd ? 1 : 0.5 }]}
          >
            <Feather name="plus" size={16} color="#020617" />
            <Text style={{ color: '#020617', fontWeight: '700' }}>Add category</Text>
          </PressableScale>
          <Text style={{ color: t.textFaint, fontSize: 11 }}>
            Built-in categories (🔒) can’t be removed. Removing your own moves its entries to “Other”.
          </Text>
        </ScrollView>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, padding: 20, paddingBottom: 32 },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2 },
  segments: { flexDirection: 'row', padding: 4, borderRadius: 12, borderWidth: 1 },
  segment: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 9 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth },
  swatch: { width: 8, height: 8, borderRadius: 4 },
  label: { fontSize: 12, fontWeight: '600', marginTop: 6 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14 },
  emojiInput: { width: 56, textAlign: 'center', fontSize: 18 },
  swatches: { flexDirection: 'row', gap: 10 },
  swatchBtn: { width: 28, height: 28, borderRadius: 14, borderWidth: 2 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: 12 },
});
