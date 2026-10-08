import { ReactNode, useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import { Theme } from '../../theme';
import InnerHorizontalScroll from '../InnerHorizontalScroll';

// 3D-looking column charts built from plain views (no SVG, so they ship over the air).
// Each column is a front face plus a skewed lighter top and darker side.

// Lightens (amount > 0) or darkens (amount < 0) a #rrggbb colour.
export function shade(hex: string, amount: number) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const mix = (c: number) => Math.round(amount >= 0 ? c + (255 - c) * amount : c * (1 + amount));
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

// One 3D column. `height` is the target height of the front face in pixels.
export function Bar3D({
  height,
  width,
  depth,
  color,
  delay = 0,
  dim = false,
  glow = false,
}: {
  height: number;
  width: number;
  depth: number;
  color: string;
  delay?: number;
  dim?: boolean;
  glow?: boolean;
}) {
  const [h] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(h, {
      toValue: Math.max(height, 2),
      duration: 700,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [h, height, delay]);

  return (
    <Animated.View style={{ width, height: h, opacity: dim ? 0.35 : 1, marginTop: depth }}>
      {/* Right side: skewed so its far edge rises by `depth`. */}
      <View
        style={{
          position: 'absolute',
          left: width,
          top: -depth / 2,
          bottom: depth / 2,
          width: depth,
          backgroundColor: shade(color, -0.35),
          transform: [{ skewY: '-45deg' }],
        }}
      />
      {/* Front face with a soft vertical highlight. */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: color }]}>
        <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: width * 0.28, backgroundColor: shade(color, 0.12) }} />
      </View>
      {/* Top: skewed so its far edge shifts right by `depth`. */}
      <View
        style={{
          position: 'absolute',
          top: -depth,
          left: depth / 2,
          width,
          height: depth,
          backgroundColor: shade(color, glow ? 0.55 : 0.3),
          transform: [{ skewX: '-45deg' }],
        }}
      />
    </Animated.View>
  );
}

export type ColumnItem = {
  key: string;
  value: number;
  color: string;
  // Text above the column (usually the amount).
  top?: string;
  // Caption under the column (emoji or short label).
  caption: ReactNode;
};

// A row of 3D columns with value labels above and captions below. Tap a column to select it.
export function ColumnChart3D({
  theme: t,
  items,
  height = 150,
  barWidth = 30,
  depth = 10,
  gap = 18,
  selectedKey,
  onSelect,
  max: maxOverride,
}: {
  theme: Theme;
  items: ColumnItem[];
  height?: number;
  barWidth?: number;
  depth?: number;
  gap?: number;
  selectedKey: string | null;
  onSelect: (key: string | null) => void;
  max?: number;
}) {
  const max = maxOverride ?? Math.max(...items.map((i) => i.value), 1);
  const content = (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap, paddingRight: depth + 4, paddingTop: 18 }}>
      {items.map((item, i) => {
        const selected = item.key === selectedKey;
        return (
          <Pressable
            key={item.key}
            onPress={() => onSelect(selected ? null : item.key)}
            style={{ alignItems: 'center', width: barWidth + depth }}
            hitSlop={{ top: 20 }}
          >
            {item.top != null && (
              <Text
                numberOfLines={1}
                style={[styles.topLabel, { color: selected ? t.text : t.textMuted, width: barWidth + depth + gap - 2 }]}
              >
                {item.top}
              </Text>
            )}
            <View style={{ alignSelf: 'flex-start' }}>
              <Bar3D
                height={(item.value / max) * height}
                width={barWidth}
                depth={depth}
                color={item.color}
                delay={i * 70}
                dim={selectedKey != null && !selected}
                glow={selected}
              />
            </View>
            <View style={[styles.floor, { width: barWidth + depth, backgroundColor: t.border }]} />
            <View style={styles.caption}>
              {typeof item.caption === 'string' ? (
                <Text numberOfLines={1} style={{ color: selected ? t.text : t.textMuted, fontSize: 11, fontWeight: selected ? '800' : '500' }}>
                  {item.caption}
                </Text>
              ) : (
                item.caption
              )}
            </View>
          </Pressable>
        );
      })}
    </View>
  );

  // Scroll sideways when the columns don't fit.
  return items.length * (barWidth + depth + gap) > 320 ? (
    <InnerHorizontalScroll contentContainerStyle={{ paddingHorizontal: 2 }}>{content}</InnerHorizontalScroll>
  ) : (
    <View style={{ alignItems: 'center' }}>{content}</View>
  );
}

const styles = StyleSheet.create({
  topLabel: { fontSize: 10, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  floor: { height: 2, borderRadius: 1, marginTop: 1, opacity: 0.7 },
  caption: { marginTop: 6, alignItems: 'center', minHeight: 18 },
});
