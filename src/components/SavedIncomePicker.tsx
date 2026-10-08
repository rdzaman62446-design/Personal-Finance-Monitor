import { Feather } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, LayoutAnimation, Pressable, StyleSheet, Text, View } from 'react-native';

import { categoryIcon, Expense, peso } from '../expenses';
import { IncomeSource, isDueOn, loggedThisPeriod, scheduleLabel } from '../incomeSources';
import { Theme } from '../theme';
import { FadeInView } from './motion';

// Dropdown of saved income sources. Picking one fills in the income form.
export default function SavedIncomePicker({
  theme: t,
  sources,
  entries,
  selectedId,
  onPick,
  onAddNew,
}: {
  theme: Theme;
  sources: IncomeSource[];
  entries: Expense[];
  selectedId: string | null;
  onPick: (source: IncomeSource) => void;
  onAddNew: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [rotation] = useState(() => new Animated.Value(0));
  const [now] = useState(() => Date.now());

  useEffect(() => {
    Animated.timing(rotation, { toValue: open ? 1 : 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [open, rotation]);

  // Due today first, then not yet received this period, then already logged.
  const rows = useMemo(
    () =>
      sources
        .map((s) => ({ s, due: isDueOn(s, now), logged: loggedThisPeriod(s, entries, now) }))
        .sort((a, b) => Number(b.due && !b.logged) - Number(a.due && !a.logged) || Number(a.logged) - Number(b.logged)),
    [sources, entries, now],
  );
  const dueCount = rows.filter((r) => r.due && !r.logged).length;
  const selected = sources.find((s) => s.id === selectedId);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.create(220, 'easeInEaseOut', 'opacity'));
    setOpen((o) => !o);
  };

  const rotate = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  if (sources.length === 0) {
    return (
      <Pressable onPress={onAddNew} style={[styles.empty, { borderColor: t.income }]}>
        <Feather name="plus-circle" size={16} color={t.income} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: t.income, fontSize: 13, fontWeight: '700' }}>Save your regular incomes</Text>
          <Text style={{ color: t.textMuted, fontSize: 11 }}>Set up each job once, then pick it here on payday</Text>
        </View>
      </Pressable>
    );
  }

  return (
    <View style={[styles.box, { borderColor: open ? t.income : t.border, backgroundColor: t.input }]}>
      <Pressable onPress={toggle} style={styles.selected}>
        <Feather name="briefcase" size={16} color={t.income} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: selected ? t.text : t.textMuted, fontSize: 14, fontWeight: selected ? '600' : '400' }}>
            {selected ? selected.name : 'Choose a saved income…'}
          </Text>
          {!selected && dueCount > 0 && (
            <Text style={{ color: t.income, fontSize: 11, fontWeight: '600' }}>
              {dueCount} due today
            </Text>
          )}
        </View>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Feather name="chevron-down" size={18} color={open ? t.income : t.textMuted} />
        </Animated.View>
      </Pressable>

      {open && (
        <View style={[styles.list, { borderTopColor: t.border }]}>
          {rows.map(({ s, due, logged }, i) => (
            <FadeInView key={s.id} delay={i * 25} from={-6}>
              <Pressable
                onPress={() => {
                  onPick(s);
                  toggle();
                }}
                style={({ pressed }) => [
                  styles.option,
                  { backgroundColor: s.id === selectedId ? t.incomeSoft : pressed ? t.cardAlt : 'transparent' },
                ]}
              >
                <Text style={{ fontSize: 16 }}>{categoryIcon(s.category)}</Text>
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={{ color: t.text, fontSize: 13, fontWeight: '600' }}>
                    {s.name}
                  </Text>
                  <Text style={{ color: t.textMuted, fontSize: 11 }}>{scheduleLabel(s)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 2 }}>
                  <Text style={{ color: t.income, fontWeight: '700', fontSize: 13 }}>{peso(s.amount)}</Text>
                  {logged ? (
                    <Text style={{ color: t.textFaint, fontSize: 10 }}>✓ logged</Text>
                  ) : due ? (
                    <Text style={[styles.badge, { color: '#020617', backgroundColor: t.income }]}>DUE TODAY</Text>
                  ) : null}
                </View>
              </Pressable>
            </FadeInView>
          ))}
          <Pressable
            onPress={() => {
              toggle();
              onAddNew();
            }}
            style={[styles.option, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.border }]}
          >
            <Feather name="plus" size={16} color={t.income} />
            <Text style={{ color: t.income, fontSize: 13, fontWeight: '600' }}>Add an income source</Text>
          </Pressable>
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
  badge: { fontSize: 9, fontWeight: '800', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
  empty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
});
