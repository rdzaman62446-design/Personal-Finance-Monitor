import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import { Theme } from '../../theme';
import { shade } from './ColumnChart3D';

export type HBarRow = { key: string; label: string; value: number; color: string; valueLabel: string };

// One horizontal 3D bar: front face, a skewed top face and an end cap that follow its length.
function HBar({ width, color, delay, h, depth, glow }: { width: number; color: string; delay: number; h: number; depth: number; glow: boolean }) {
  const [w] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(w, { toValue: Math.max(width, 3), duration: 700, delay, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [w, width, delay]);
  return (
    <Animated.View style={{ width: w, height: h, marginTop: depth }}>
      <View
        style={{
          position: 'absolute',
          top: -depth,
          left: depth / 2,
          right: -depth / 2,
          height: depth,
          backgroundColor: shade(color, glow ? 0.5 : 0.3),
          transform: [{ skewX: '-45deg' }],
        }}
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: color }]} />
      <Animated.View
        style={{
          position: 'absolute',
          left: w,
          top: -depth / 2,
          width: depth,
          height: h,
          backgroundColor: shade(color, -0.35),
          transform: [{ skewY: '-45deg' }],
        }}
      />
    </Animated.View>
  );
}

// Horizontal 3D bar chart: one labelled row per item. Tap a row to select it.
export default function HBarChart3D({
  theme: t,
  rows,
  selectedKey,
  onSelect,
}: {
  theme: Theme;
  rows: HBarRow[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
}) {
  const [trackWidth, setTrackWidth] = useState(0);
  const max = Math.max(...rows.map((r) => r.value), 1);
  const depth = 7;
  return (
    <View style={{ gap: 10 }}>
      {rows.map((r, i) => {
        const selected = r.key === selectedKey;
        return (
          <Pressable key={r.key} onPress={() => onSelect(r.key)} style={styles.row}>
            <Text style={[styles.label, { color: selected ? t.text : t.textMuted, fontWeight: selected ? '800' : '500' }]}>{r.label}</Text>
            <View style={{ flex: 1 }} onLayout={i === 0 ? (e) => setTrackWidth(e.nativeEvent.layout.width) : undefined}>
              {trackWidth > 0 && (
                <HBar
                  width={(r.value / max) * (trackWidth - depth - 70)}
                  color={selected ? r.color : shade(r.color, -0.15)}
                  delay={i * 80}
                  h={14}
                  depth={depth}
                  glow={selected}
                />
              )}
            </View>
            <Text numberOfLines={1} style={[styles.value, { color: selected ? t.text : t.textMuted }]}>
              {r.valueLabel}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { width: 34, fontSize: 12 },
  value: { position: 'absolute', right: 0, fontSize: 11, fontWeight: '700' },
});
