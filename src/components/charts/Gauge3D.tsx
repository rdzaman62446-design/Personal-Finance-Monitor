import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { Theme } from '../../theme';
import { shade } from './ColumnChart3D';

// Half-disc wedge (see Pie3D) spanning `sweep` degrees clockwise from `start`.
function Wedge({ size, start, sweep, color }: { size: number; start: number; sweep: number; color: string }) {
  return (
    <View style={{ position: 'absolute', width: size, height: size, transform: [{ rotate: `${start}deg` }] }}>
      <View style={{ position: 'absolute', left: size / 2, width: size / 2, height: size, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', left: -size / 2, width: size, height: size, transform: [{ rotate: `${sweep}deg` }] }}>
          <View style={{ width: size / 2, height: size, backgroundColor: color, borderTopLeftRadius: size / 2, borderBottomLeftRadius: size / 2 }} />
        </View>
      </View>
    </View>
  );
}

// A raised half-ring meter (like a speedometer) for how much of a budget is used.
export default function Gauge3D({
  theme: t,
  ratio,
  color,
  size = 210,
  thickness = 0.34,
  depth = 8,
  center,
  caption,
}: {
  theme: Theme;
  ratio: number;
  color: string;
  size?: number;
  thickness?: number;
  depth?: number;
  center: string;
  caption: string;
}) {
  const [fill] = useState(() => new Animated.Value(0));
  const [sweep, setSweep] = useState(0);
  useEffect(() => {
    const id = fill.addListener(({ value }) => setSweep(value));
    return () => fill.removeListener(id);
  }, [fill]);
  useEffect(() => {
    Animated.timing(fill, {
      toValue: Math.min(1, Math.max(0, ratio)) * 180,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [fill, ratio]);

  const R = size / 2;
  const hole = size * (1 - thickness);
  // The arc runs from 9 o'clock (270°) over the top to 3 o'clock.
  const ring = (track: string, bar: string) => (
    <>
      <Wedge size={size} start={270} sweep={180} color={track} />
      {sweep > 0.5 && <Wedge size={size} start={270} sweep={sweep} color={bar} />}
    </>
  );

  return (
    <View style={{ width: size, height: R + depth + 4, alignSelf: 'center', overflow: 'hidden' }}>
      {/* Edge: darker copies stacked underneath. */}
      {Array.from({ length: depth }, (_, i) => depth - i).map((k) => (
        <View key={k} style={[StyleSheet.absoluteFill, { height: size, transform: [{ translateY: k }] }]}>
          {ring(shade(t.border, -0.3), shade(color, -0.4))}
        </View>
      ))}
      <View style={[StyleSheet.absoluteFill, { height: size }]}>
        {ring(t.border, color)}
        {/* Inner wall of the ring, then the hole. */}
        <View
          style={{
            position: 'absolute',
            left: (size - hole) / 2,
            top: (size - hole) / 2,
            width: hole,
            height: hole,
            borderRadius: hole / 2,
            backgroundColor: shade(color, -0.55),
          }}
        />
        <View
          style={{
            position: 'absolute',
            left: (size - hole) / 2,
            top: (size - hole) / 2 + depth * 0.6,
            width: hole,
            height: hole,
            borderRadius: hole / 2,
            backgroundColor: t.card,
          }}
        />
      </View>
      <View style={[styles.center, { top: R - hole * 0.32, width: size }]}>
        <Text style={{ color, fontSize: 26, fontWeight: '800' }}>{center}</Text>
        <Text style={{ color: t.textMuted, fontSize: 11 }}>{caption}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { position: 'absolute', left: 0, alignItems: 'center' },
});
