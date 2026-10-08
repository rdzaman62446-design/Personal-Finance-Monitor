import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Theme } from '../theme';

export type MenuItem = { icon: keyof typeof Feather.glyphMap; label: string; onPress: () => void; color?: string };
export type MenuSection = { title: string; items: MenuItem[] };

// Drawer that slides in from the left with the app's secondary actions.
export default function SideMenu({
  theme: t,
  visible,
  onClose,
  sections,
  darkMode,
  onToggleTheme,
  footer,
}: {
  theme: Theme;
  visible: boolean;
  onClose: () => void;
  sections: MenuSection[];
  darkMode: boolean;
  onToggleTheme: () => void;
  footer: string;
}) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const panelWidth = Math.min(320, width * 0.82);
  const [progress] = useState(() => new Animated.Value(0));
  // Kept mounted while the close animation plays.
  const [mounted, setMounted] = useState(visible);
  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    if (visible) {
      Animated.timing(progress, { toValue: 1, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    } else {
      Animated.timing(progress, { toValue: 0, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(
        ({ finished }) => finished && setMounted(false),
      );
    }
  }, [visible, progress]);

  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [-panelWidth, 0] });

  // Run the action after the drawer starts closing so sheets/pickers open cleanly on top.
  const run = (fn: () => void) => {
    onClose();
    setTimeout(fn, 220);
  };

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.55)', opacity: progress }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <Animated.View
        style={[
          styles.panel,
          {
            width: panelWidth,
            backgroundColor: t.card,
            borderRightColor: t.border,
            paddingTop: insets.top + 12,
            paddingBottom: insets.bottom + 12,
            transform: [{ translateX }],
          },
        ]}
      >
        <View style={styles.brand}>
          <View style={[styles.logo, { backgroundColor: t.accentSoft }]}>
            <Feather name="credit-card" size={20} color={t.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: t.text, fontWeight: '800', fontSize: 18 }}>SpendTrack</Text>
            <Text style={{ color: t.textMuted, fontSize: 11 }}>PHP (₱) Quick Logger</Text>
          </View>
          <Pressable hitSlop={10} onPress={onClose}>
            <Feather name="x" size={20} color={t.textMuted} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 12 }}>
          <Pressable onPress={onToggleTheme} style={[styles.item, styles.themeRow, { backgroundColor: t.cardAlt }]}>
            <Feather name={darkMode ? 'moon' : 'sun'} size={18} color={darkMode ? t.purple : t.amber} />
            <Text style={[styles.itemText, { color: t.text }]}>Dark mode</Text>
            <Switch value={darkMode} onValueChange={onToggleTheme} trackColor={{ true: t.accent, false: t.border }} thumbColor="#fff" />
          </Pressable>

          {sections.map((section) => (
            <View key={section.title} style={{ marginTop: 14 }}>
              <Text style={[styles.sectionTitle, { color: t.textFaint }]}>{section.title}</Text>
              {section.items.map((item) => (
                <Pressable
                  key={item.label}
                  onPress={() => run(item.onPress)}
                  style={({ pressed }) => [styles.item, { backgroundColor: pressed ? t.cardAlt : 'transparent' }]}
                >
                  <Feather name={item.icon} size={18} color={item.color ?? t.textMuted} />
                  <Text style={[styles.itemText, { color: item.color ?? t.text }]}>{item.label}</Text>
                </Pressable>
              ))}
            </View>
          ))}
        </ScrollView>

        <Text style={{ color: t.textFaint, fontSize: 11, paddingHorizontal: 20 }}>{footer}</Text>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  panel: { position: 'absolute', top: 0, bottom: 0, left: 0, borderRightWidth: 1, elevation: 16 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 16 },
  logo: { padding: 10, borderRadius: 14 },
  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1, paddingHorizontal: 20, marginBottom: 4 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 13 },
  itemText: { flex: 1, fontSize: 14, fontWeight: '500' },
  themeRow: { marginHorizontal: 12, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
});
