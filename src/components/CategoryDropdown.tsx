import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Animated, Easing, LayoutAnimation, Pressable, StyleSheet, Text, View } from 'react-native';

import { categoriesFor, Category, categoryIcon } from '../expenses';
import { Theme } from '../theme';
import { FadeInView } from './motion';

// A dropdown that expands in place to show every category.
export default function CategoryDropdown({
  theme: t,
  value,
  onChange,
  options = categoriesFor('expense'),
}: {
  theme: Theme;
  value: string;
  onChange: (category: string) => void;
  options?: Category[];
}) {
  const [open, setOpen] = useState(false);
  const [rotation] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(rotation, {
      toValue: open ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [open, rotation]);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.create(220, 'easeInEaseOut', 'opacity'));
    setOpen((o) => !o);
  };

  const pick = (name: string) => {
    onChange(name);
    toggle();
  };

  const rotate = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  return (
    <View style={[styles.box, { borderColor: open ? t.accent : t.border, backgroundColor: t.input }]}>
      <Pressable onPress={toggle} style={styles.selected}>
        <Text style={{ fontSize: 18 }}>{categoryIcon(value)}</Text>
        <Text style={{ flex: 1, color: t.text, fontSize: 14, fontWeight: '600' }}>{value}</Text>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Feather name="chevron-down" size={18} color={open ? t.accent : t.textMuted} />
        </Animated.View>
      </Pressable>

      {open && (
        <View style={[styles.list, { borderTopColor: t.border }]}>
          {options.map((c, i) => {
            const active = c.name === value;
            return (
              <FadeInView key={c.name} delay={i * 25} from={-6}>
                <Pressable
                  onPress={() => pick(c.name)}
                  style={({ pressed }) => [
                    styles.option,
                    { backgroundColor: active ? t.accentSoft : pressed ? t.cardAlt : 'transparent' },
                  ]}
                >
                  <Text style={{ fontSize: 16 }}>{c.icon}</Text>
                  <Text style={{ flex: 1, color: active ? t.accent : t.text, fontSize: 14, fontWeight: active ? '700' : '400' }}>
                    {c.name}
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
  selected: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  list: { borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 4 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 11 },
});
