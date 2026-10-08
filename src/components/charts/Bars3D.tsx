import { useState } from 'react';
import { Text, View } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';

import { shade } from '../../color';
import { Theme } from '../../theme';

export type Bar = { key: string; value: number; label: string; color: string; topLabel?: string };

// Real 3D bar chart (SVG, via react-native-gifted-charts). Tap a bar to select it.
export default function Bars3D({
  theme: t,
  bars,
  selectedKey,
  onSelect,
  height = 160,
  barWidth,
}: {
  theme: Theme;
  bars: Bar[];
  selectedKey: string | null;
  onSelect: (key: string | null) => void;
  height?: number;
  barWidth?: number;
}) {
  const [width, setWidth] = useState(0);
  const n = Math.max(bars.length, 1);
  const max = Math.max(...bars.map((b) => b.value), 1);
  // Fit all bars in the card: share the width between bars, their 3D sides and the gaps.
  const usable = Math.max(width - 24, 120);
  const bw = barWidth ?? Math.min(46, Math.max(16, (usable / n) * 0.5));
  const side = Math.round(bw * 0.35);
  const spacing = Math.max(8, usable / n - bw - side);

  const data = bars.map((b) => {
    const selected = b.key === selectedKey;
    const dim = selectedKey != null && !selected;
    const front = dim ? shade(b.color, -0.45) : b.color;
    return {
      value: b.value,
      label: b.label,
      frontColor: front,
      sideColor: shade(front, -0.35),
      topColor: shade(front, selected ? 0.5 : 0.28),
      topLabelComponent: () => (
        <Text
          numberOfLines={1}
          style={{ color: selected ? t.text : t.textMuted, fontSize: 10, fontWeight: '800', width: bw + side + spacing, textAlign: 'center', marginBottom: 4 }}
        >
          {b.topLabel ?? ''}
        </Text>
      ),
    };
  });

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ overflow: 'hidden' }}>
      {width > 0 && (
        <BarChart
          key={`${width}-${n}`}
          data={data}
          isThreeD
          isAnimated
          animationDuration={700}
          height={height}
          maxValue={max * 1.15}
          barWidth={bw}
          sideWidth={side}
          spacing={spacing}
          initialSpacing={12}
          endSpacing={side + 4}
          noOfSections={4}
          hideYAxisText
          yAxisThickness={0}
          yAxisLabelWidth={0}
          xAxisThickness={1}
          xAxisColor={t.border}
          rulesColor={t.border}
          rulesType="solid"
          xAxisLabelTextStyle={{ color: t.textMuted, fontSize: 11, fontWeight: '600' }}
          disableScroll
          onPress={(_: unknown, index: number) => {
            const key = bars[index]?.key ?? null;
            onSelect(key === selectedKey ? null : key);
          }}
        />
      )}
    </View>
  );
}
