import { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import { Theme } from '../../theme';
import { shade } from './ColumnChart3D';

export type PieSlice = { key: string; value: number; color: string; label: string };

// One wedge from `start` through `sweep` degrees (clockwise from 12 o'clock), sweep ≤ 180.
// Built from a half-disc rotated inside a half-width clipping view.
function Wedge({ size, start, sweep, color }: { size: number; start: number; sweep: number; color: string }) {
  return (
    <View style={{ position: 'absolute', width: size, height: size, transform: [{ rotate: `${start}deg` }] }}>
      <View style={{ position: 'absolute', left: size / 2, width: size / 2, height: size, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', left: -size / 2, width: size, height: size, transform: [{ rotate: `${sweep}deg` }] }}>
          <View
            style={{
              width: size / 2,
              height: size,
              backgroundColor: color,
              borderTopLeftRadius: size / 2,
              borderBottomLeftRadius: size / 2,
            }}
          />
        </View>
      </View>
    </View>
  );
}

type Arc = { key: string; start: number; sweep: number; color: string; mid: number };

// Splits arcs over 180° into two wedges.
function Arcs({ arcs, size, colorOf, offsetOf }: { arcs: Arc[]; size: number; colorOf: (a: Arc) => string; offsetOf: (a: Arc) => [number, number] }) {
  return (
    <>
      {arcs.map((a) => {
        const [dx, dy] = offsetOf(a);
        const parts = a.sweep > 180 ? [[a.start, 180], [a.start + 180, a.sweep - 180]] : [[a.start, a.sweep]];
        return (
          <View key={a.key} style={[StyleSheet.absoluteFill, { transform: [{ translateX: dx }, { translateY: dy }] }]}>
            {parts.map(([s, w], i) => (
              // A hair of overlap hides seams between neighbouring wedges.
              <Wedge key={i} size={size} start={s} sweep={Math.min(180, w + 0.6)} color={colorOf(a)} />
            ))}
          </View>
        );
      })}
    </>
  );
}

// Tilted 3D pie: stacked darker copies form the edge, the top layer carries the colours.
// Tap a slice to select it; the selected slice lifts out of the pie.
export default function Pie3D({
  theme: t,
  slices,
  selectedKey,
  onSelect,
  size = 190,
  tilt = 0.58,
  depth = 10,
}: {
  theme: Theme;
  slices: PieSlice[];
  selectedKey: string | null;
  onSelect: (key: string | null) => void;
  size?: number;
  tilt?: number;
  depth?: number;
}) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  const arcs = useMemo(
    () =>
      slices.reduce<Arc[]>((list, s) => {
        const start = list.length ? list[list.length - 1].start + list[list.length - 1].sweep : 0;
        const sweep = total > 0 ? (s.value / total) * 360 : 0;
        return [...list, { key: s.key, start, sweep, color: s.color, mid: start + sweep / 2 }];
      }, []),
    [slices, total],
  );

  const [spin] = useState(() => new Animated.Value(0));
  useEffect(() => {
    spin.setValue(0);
    Animated.timing(spin, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [spin, slices]);

  const R = size / 2;
  const lift = 10;
  const offsetOf = (a: Arc): [number, number] => {
    if (a.key !== selectedKey) return [0, 0];
    const rad = (a.mid * Math.PI) / 180;
    return [Math.sin(rad) * lift, -Math.cos(rad) * lift];
  };

  // Labels sit on an unscaled overlay, so text isn't squashed by the tilt.
  const flatHeight = size * tilt;
  const labelFor = (a: Arc) => {
    const rad = (a.mid * Math.PI) / 180;
    const [dx, dy] = offsetOf(a);
    return { x: R + Math.sin(rad) * R * 0.62 + dx, y: flatHeight / 2 + (-Math.cos(rad) * R * 0.62 + dy) * tilt };
  };

  // Map a tap on the tilted pie back to an angle to find the slice.
  const handlePress = (x: number, y: number) => {
    const dx = x - R;
    const dy = (y - flatHeight / 2) / tilt;
    if (Math.hypot(dx, dy) > R + lift) return onSelect(null);
    const angle = ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360;
    const hit = arcs.find((a) => angle >= a.start && angle < a.start + a.sweep);
    onSelect(hit && hit.key !== selectedKey ? hit.key : null);
  };

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['-90deg', '0deg'] });

  return (
    <Pressable
      onPress={(e) => handlePress(e.nativeEvent.locationX, e.nativeEvent.locationY)}
      style={{ width: size, height: flatHeight + depth * tilt + 4, alignSelf: 'center' }}
    >
      {/* Not touchable itself, so tap coordinates are relative to the Pressable. */}
      <Animated.View pointerEvents="none" style={{ opacity: spin }}>
        {/* Shadow on the "table". */}
        <View
          style={{
            position: 'absolute',
            left: size * 0.06,
            top: flatHeight * 0.18 + depth * tilt,
            width: size * 0.88,
            height: flatHeight * 0.88,
            borderRadius: size,
            backgroundColor: 'rgba(0,0,0,0.25)',
          }}
        />
        {/* Squash vertically to tilt the pie; edge layers are drawn bottom-up. */}
        <View style={{ width: size, height: size, transform: [{ translateY: -(size - flatHeight) / 2 }, { scaleY: tilt }] }}>
          {Array.from({ length: depth }, (_, i) => depth - i).map((k) => (
            <View key={k} style={[StyleSheet.absoluteFill, { transform: [{ translateY: k }] }]}>
              <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ rotate }] }]}>
                <Arcs arcs={arcs} size={size} colorOf={(a) => shade(a.color, -0.45 + k * 0.012)} offsetOf={offsetOf} />
              </Animated.View>
            </View>
          ))}
          <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ rotate }] }]}>
            <Arcs arcs={arcs} size={size} colorOf={(a) => (a.key === selectedKey ? shade(a.color, 0.15) : a.color)} offsetOf={offsetOf} />
            {/* Soft highlight across the top-left of the pie. */}
            <View
              pointerEvents="none"
              style={{ position: 'absolute', left: size * 0.12, top: size * 0.1, width: size * 0.45, height: size * 0.45, borderRadius: size, backgroundColor: 'rgba(255,255,255,0.07)' }}
            />
          </Animated.View>
        </View>
        {/* Percentage labels for slices big enough to hold them. */}
        {arcs
          .filter((a) => a.sweep >= 22)
          .map((a) => {
            const { x, y } = labelFor(a);
            const slice = slices.find((s) => s.key === a.key)!;
            return (
              <View key={a.key} pointerEvents="none" style={[styles.label, { left: x - 28, top: y - 11 }]}>
                <Text style={styles.labelText}>
                  {slice.label} {Math.round((a.sweep / 360) * 100)}%
                </Text>
              </View>
            );
          })}
      </Animated.View>
      {total === 0 && (
        <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={{ color: t.textFaint, fontSize: 12 }}>No spending yet</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  label: { position: 'absolute', width: 56, alignItems: 'center' },
  labelText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
