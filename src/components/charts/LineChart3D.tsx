import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import { Theme } from '../../theme';
import { shade } from './ColumnChart3D';

export type LinePoint = { key: string; value: number; label: string };

// A raised "ribbon" line chart with a shaded area underneath, built from rotated
// views. Tap anywhere to select the nearest point.
export default function LineChart3D({
  theme: t,
  points,
  color,
  height = 130,
  selectedKey,
  onSelect,
  highlightKey,
  formatValue,
  axisLabels,
}: {
  theme: Theme;
  points: LinePoint[];
  color: string;
  height?: number;
  selectedKey: string | null;
  onSelect: (key: string | null) => void;
  // A point to mark even when nothing is selected (e.g. today).
  highlightKey?: string | null;
  formatValue: (v: number) => string;
  // Indexes of points to label on the x-axis.
  axisLabels: number[];
}) {
  const [width, setWidth] = useState(0);
  const [reveal] = useState(() => new Animated.Value(0));

  useEffect(() => {
    reveal.setValue(0);
    Animated.timing(reveal, { toValue: 1, duration: 1000, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [reveal, points]);

  const max = Math.max(...points.map((p) => p.value), 1);
  const top = 22; // room for the tooltip
  const n = points.length;
  const step = n > 1 ? width / (n - 1) : width;
  const pos = points.map((p, i) => ({ x: i * step, y: top + height - (p.value / max) * height }));
  const thick = 3;
  const lift = 4; // how far the ribbon's shadow sits below the line

  const segment = (i: number, dy: number, c: string, h: number) => {
    const a = pos[i];
    const b = pos[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const angle = Math.atan2(b.y - a.y, b.x - a.x);
    return (
      <View
        key={`${i}-${dy}`}
        style={{
          position: 'absolute',
          left: (a.x + b.x) / 2 - len / 2,
          top: (a.y + b.y) / 2 - h / 2 + dy,
          width: len + 1,
          height: h,
          borderRadius: h / 2,
          backgroundColor: c,
          transform: [{ rotate: `${angle}rad` }],
        }}
      />
    );
  };

  const selectedIndex = points.findIndex((p) => p.key === selectedKey);
  const sel = selectedIndex >= 0 ? pos[selectedIndex] : null;

  return (
    <View>
      <Pressable
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        onPress={(e) => {
          if (!width || n === 0) return;
          const i = Math.max(0, Math.min(n - 1, Math.round(e.nativeEvent.locationX / step)));
          onSelect(points[i].key === selectedKey ? null : points[i].key);
        }}
        style={{ height: top + height + lift + 6 }}
      >
        {width > 0 && (
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              overflow: 'hidden',
              width: reveal.interpolate({ inputRange: [0, 1], outputRange: [0, width + 12] }),
            }}
          >
            {/* Grid lines. */}
            {[0, 0.5, 1].map((f) => (
              <View key={f} style={[styles.grid, { top: top + height * f, width, backgroundColor: t.border }]} />
            ))}
            {/* Area under the line: one slim column per point, fading with height. */}
            {pos.map((p, i) => (
              <View
                key={`a${i}`}
                style={{
                  position: 'absolute',
                  left: p.x - step / 2,
                  top: p.y,
                  width: Math.max(step, 2),
                  height: top + height - p.y,
                  backgroundColor: color,
                  opacity: 0.1 + (points[i].value / max) * 0.18,
                }}
              />
            ))}
            {/* Ribbon: a darker copy offset downward, then the line itself. */}
            {pos.slice(0, -1).map((_, i) => segment(i, lift, shade(color, -0.45), thick + 1))}
            {pos.slice(0, -1).map((_, i) => segment(i, 0, color, thick))}
            {/* Points with spending get a dot; the selected / highlighted one is bigger. */}
            {pos.map((p, i) => {
              const key = points[i].key;
              const big = key === selectedKey || (selectedKey == null && key === highlightKey);
              if (!big && points[i].value === 0) return null;
              const r = big ? 7 : 3.5;
              return (
                <View
                  key={`d${i}`}
                  style={{
                    position: 'absolute',
                    left: p.x - r,
                    top: p.y - r,
                    width: r * 2,
                    height: r * 2,
                    borderRadius: r,
                    backgroundColor: big ? '#fff' : color,
                    borderWidth: big ? 3 : 0,
                    borderColor: key === selectedKey ? color : t.amber,
                  }}
                />
              );
            })}
          </Animated.View>
        )}
        {sel && (
          <View
            pointerEvents="none"
            style={[styles.tip, { left: Math.min(Math.max(sel.x - 45, 0), width - 90), top: Math.max(sel.y - 34, 0), backgroundColor: t.text }]}
          >
            <Text style={{ color: t.bg, fontSize: 11, fontWeight: '800' }}>{formatValue(points[selectedIndex].value)}</Text>
          </View>
        )}
      </Pressable>
      <View style={{ height: 14 }}>
        {width > 0 &&
          axisLabels.map((i) => (
            <Text key={i} style={[styles.axis, { left: Math.min(Math.max(i * step - 15, 0), width - 30), color: t.textFaint }]}>
              {points[i]?.label}
            </Text>
          ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { position: 'absolute', left: 0, height: StyleSheet.hairlineWidth, opacity: 0.8 },
  tip: { position: 'absolute', width: 90, alignItems: 'center', paddingVertical: 4, borderRadius: 8 },
  axis: { position: 'absolute', width: 30, textAlign: 'center', fontSize: 10 },
});
