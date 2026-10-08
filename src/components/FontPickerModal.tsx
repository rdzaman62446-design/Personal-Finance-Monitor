import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { LOG_FONTS, logText } from '../fonts';
import { Theme } from '../theme';
import { FadeInView } from './motion';

// Bottom sheet listing the log fonts, each previewed on a sample entry.
export default function FontPickerModal({
  theme,
  visible,
  current,
  fontsReady,
  onClose,
  onPick,
}: {
  theme: Theme;
  visible: boolean;
  current: string;
  fontsReady: boolean;
  onClose: () => void;
  onPick: (key: string) => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        {visible && <FontSheet theme={theme} current={current} fontsReady={fontsReady} onPick={onPick} />}
      </Pressable>
    </Modal>
  );
}

function FontSheet({
  theme: t,
  current,
  fontsReady,
  onPick,
}: {
  theme: Theme;
  current: string;
  fontsReady: boolean;
  onPick: (key: string) => void;
}) {
  const [slide] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(slide, { toValue: 1, duration: 320, easing: Easing.out(Easing.back(1.1)), useNativeDriver: true }).start();
  }, [slide]);
  const translateY = slide.interpolate({ inputRange: [0, 1], outputRange: [600, 0] });

  return (
    <Animated.View style={{ transform: [{ translateY }], maxHeight: '85%' }}>
      <Pressable style={[styles.sheet, { backgroundColor: t.card, borderColor: t.border }]}>
        <View style={[styles.handle, { backgroundColor: t.border }]} />
        <Text style={{ color: t.text, fontWeight: '700', fontSize: 17 }}>Log font</Text>
        <Text style={{ color: t.textMuted, fontSize: 12, marginBottom: 6 }}>
          Changes how your entries look in Table Log and Recent Logs.
        </Text>
        <ScrollView contentContainerStyle={{ gap: 8 }}>
          {LOG_FONTS.map((f, i) => {
            const active = f.key === current;
            // Until custom fonts load, preview everything in the system font.
            const font = fontsReady ? f : LOG_FONTS[0];
            return (
              <FadeInView key={f.key} delay={i * 40}>
                <Pressable
                  onPress={() => onPick(f.key)}
                  style={({ pressed }) => [
                    styles.option,
                    {
                      borderColor: active ? t.accent : t.border,
                      backgroundColor: active ? t.accentSoft : pressed ? t.cardAlt : t.input,
                    },
                  ]}
                >
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ color: t.textMuted, fontSize: 11, fontWeight: '600' }}>
                      {f.label} · {f.note}
                    </Text>
                    <Text style={[logText(font, true, 15), { color: t.text }]}>Burger & fries with friends</Text>
                    <Text style={[logText(font, false, 12), { color: t.textMuted }]}>₱150.00 · Oct 07, 1:25 PM</Text>
                  </View>
                  {active && <Feather name="check-circle" size={20} color={t.accent} />}
                </Pressable>
              </FadeInView>
            );
          })}
        </ScrollView>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, padding: 20, paddingBottom: 32, gap: 4 },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: 6 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
});
