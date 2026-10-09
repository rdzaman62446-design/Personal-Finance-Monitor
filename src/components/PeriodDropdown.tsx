import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Animated, Easing, LayoutAnimation, Pressable, StyleSheet, Text, View } from 'react-native';

import { PERIODS, periodDates, PeriodKey, periodLabel } from '../periods';
import { Theme } from '../theme';
import { FadeInView } from './motion';

// Dropdown for the Table Log's time period, showing the dates it covers.
export default function PeriodDropdown({
  theme: t,
  value,
  now,
  custom,
  onChange,
  onCustom,
}: {
  theme: Theme;
  value: PeriodKey;
  now: number;
  custom: [number, number] | null;
  onChange: (p: PeriodKey) => void;
  // Opens the range picker; the parent switches to 'custom' once a range is chosen.
  onCustom: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [rotation] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(rotation, { toValue: open ? 1 : 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [open, rotation]);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.create(220, 'easeInEaseOut', 'opacity'));
    setOpen((o) => !o);
  };

  const rotate = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const current = PERIODS.find((p) => p.key === value);

  return (
    <View style={[styles.box, { borderColor: open ? t.accent : t.border, backgroundColor: t.card }]}>
      <Pressable onPress={toggle} style={styles.selected}>
        <Text style={{ fontSize: 16 }}>{current?.icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ color: t.text, fontSize: 14, fontWeight: '700' }}>{periodLabel(value)}</Text>
          <Text style={{ color: t.textMuted, fontSize: 11 }}>{periodDates(value, now, custom)}</Text>
        </View>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Feather name="chevron-down" size={18} color={open ? t.accent : t.textMuted} />
        </Animated.View>
      </Pressable>

      {open && (
        <View style={[styles.list, { borderTopColor: t.border }]}>
          {PERIODS.map((p, i) => {
            const active = p.key === value;
            return (
              <FadeInView key={p.key} delay={i * 20} from={-6}>
                <Pressable
                  onPress={() => {
                    toggle();
                    if (p.key === 'custom') onCustom();
                    else onChange(p.key);
                  }}
                  style={({ pressed }) => [
                    styles.option,
                    { backgroundColor: active ? t.accentSoft : pressed ? t.cardAlt : 'transparent' },
                  ]}
                >
                  <Text style={{ fontSize: 15 }}>{p.icon}</Text>
                  <Text style={{ flex: 1, color: active ? t.accent : t.text, fontSize: 14, fontWeight: active ? '700' : '400' }}>{p.label}</Text>
                  <Text style={{ color: t.textFaint, fontSize: 11 }}>
                    {p.key === 'all' ? '' : p.key === 'custom' ? (custom ? periodDates('custom', now, custom) : 'Pick dates') : periodDates(p.key, now)}
                  </Text>
                  {active && <Feather name="check" size={16} color={t.accent} />}
                </Pressable>
              </FadeInView>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  selected: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10 },
  list: { borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 4 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10 },
});
