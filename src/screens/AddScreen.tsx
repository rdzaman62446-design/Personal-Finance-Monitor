import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, TextInput, Vibration, View } from 'react-native';

import CategoryDropdown from '../components/CategoryDropdown';
import { AnimatedBar, AnimatedNumber, FadeInView, PressableScale } from '../components/motion';
import { CATEGORIES, categoryIcon, Expense, formatDate, formatDay, formatTime, parseAmount, peso } from '../expenses';
import { budgetColor, Theme } from '../theme';

type Props = {
  theme: Theme;
  expenses: Expense[];
  spentToday: number;
  spentThisMonth: number;
  monthlyBudget: number | null;
  onAdd: (e: Omit<Expense, 'id' | 'timestamp'>) => void;
  onViewAll: () => void;
  onSetBudget: () => void;
};

export default function AddScreen({
  theme: t,
  expenses,
  spentToday,
  spentThisMonth,
  monthlyBudget,
  onAdd,
  onViewAll,
  onSetBudget,
}: Props) {
  const [item, setItem] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0].name);
  const [justAdded, setJustAdded] = useState(false);
  const [pop] = useState(() => new Animated.Value(0));

  const parsed = parseAmount(amount);
  const canSubmit = item.trim().length > 0 && parsed != null;

  useEffect(() => {
    if (!justAdded) return;
    const timer = setTimeout(() => setJustAdded(false), 1300);
    return () => clearTimeout(timer);
  }, [justAdded]);

  const submit = () => {
    if (!canSubmit) return;
    onAdd({ item: item.trim(), amount: parsed, category });
    setItem('');
    setAmount('');
    setJustAdded(true);
    Vibration.vibrate(40);
    pop.setValue(0);
    Animated.timing(pop, { toValue: 1, duration: 500, easing: Easing.out(Easing.back(3)), useNativeDriver: true }).start();
  };

  const ratio = monthlyBudget ? spentThisMonth / monthlyBudget : 0;
  const remaining = monthlyBudget ? monthlyBudget - spentThisMonth : 0;
  const checkScale = pop.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] });

  return (
    <View style={{ gap: 16 }}>
      <FadeInView>
        <View style={[styles.banner, { backgroundColor: t.card, borderColor: t.border }]}>
          <View style={styles.bannerRow}>
            <View>
              <Text style={[styles.small, { color: t.textMuted }]}>Today</Text>
              <AnimatedNumber value={spentToday} format={peso} style={[styles.big, { color: t.accent }]} />
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.small, { color: t.textMuted }]}>This Month</Text>
              <AnimatedNumber value={spentThisMonth} format={peso} style={[styles.medium, { color: t.text }]} />
            </View>
          </View>

          {monthlyBudget ? (
            <Pressable onPress={onSetBudget} style={{ gap: 6, marginTop: 12 }}>
              <AnimatedBar percent={ratio * 100} color={budgetColor(t, ratio)} trackColor={t.border} />
              <Text style={{ color: budgetColor(t, ratio), fontSize: 12, fontWeight: '600' }}>
                {remaining >= 0
                  ? `${peso(remaining)} left of ${peso(monthlyBudget)} budget`
                  : `${peso(-remaining)} over your ${peso(monthlyBudget)} budget`}
              </Text>
            </Pressable>
          ) : (
            <Pressable onPress={onSetBudget} style={[styles.setBudget, { borderColor: t.border }]}>
              <Feather name="target" size={14} color={t.accent} />
              <Text style={{ color: t.accent, fontSize: 12, fontWeight: '600' }}>Set a monthly budget</Text>
            </Pressable>
          )}
        </View>
      </FadeInView>

      <FadeInView delay={80}>
        <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
          <View style={styles.row}>
            <Feather name="plus" size={16} color={t.accent} />
            <Text style={[styles.cardTitle, { color: t.text }]}>New Expense Entry</Text>
          </View>

          <Text style={[styles.label, { color: t.textMuted }]}>How much? (₱)</Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            placeholderTextColor={t.textFaint}
            keyboardType="decimal-pad"
            style={[styles.amountInput, { backgroundColor: t.input, borderColor: t.border, color: t.text }]}
          />

          <Text style={[styles.label, { color: t.textMuted }]}>What did you spend on?</Text>
          <TextInput
            value={item}
            onChangeText={setItem}
            placeholder="e.g. Commute, Dinner, Groceries"
            placeholderTextColor={t.textFaint}
            returnKeyType="done"
            onSubmitEditing={submit}
            style={[styles.input, { backgroundColor: t.input, borderColor: t.border, color: t.text }]}
          />

          <Text style={[styles.label, { color: t.textMuted }]}>Category</Text>
          <CategoryDropdown theme={t} value={category} onChange={setCategory} />

          <PressableScale
            onPress={submit}
            disabled={!canSubmit && !justAdded}
            style={[styles.submit, { backgroundColor: t.accent, opacity: canSubmit || justAdded ? 1 : 0.5 }]}
          >
            {justAdded ? (
              <Animated.View style={[styles.row, { transform: [{ scale: checkScale }] }]}>
                <Feather name="check-circle" size={20} color="#020617" />
                <Text style={styles.submitText}>Added!</Text>
              </Animated.View>
            ) : (
              <>
                <Feather name="plus" size={20} color="#020617" />
                <Text style={styles.submitText}>Add Expense</Text>
              </>
            )}
          </PressableScale>
        </View>
      </FadeInView>

      <FadeInView delay={160} style={{ gap: 8 }}>
        <View style={[styles.row, { justifyContent: 'space-between' }]}>
          <Text style={[styles.sectionTitle, { color: t.textMuted }]}>RECENT LOGS</Text>
          <Pressable onPress={onViewAll} hitSlop={8}>
            <Text style={{ color: t.accent, fontSize: 12 }}>View All ({expenses.length})</Text>
          </Pressable>
        </View>
        {expenses.length === 0 && (
          <Text style={{ color: t.textFaint, fontSize: 12, textAlign: 'center', paddingVertical: 12 }}>
            No expenses yet. Add your first one above.
          </Text>
        )}
        {expenses.slice(0, 3).map((e) => (
          <FadeInView key={e.id} from={-10}>
            <View style={[styles.recent, { backgroundColor: t.card, borderColor: t.border }]}>
              <View style={[styles.row, { flex: 1 }]}>
                <Text style={{ fontSize: 18 }}>{categoryIcon(e.category)}</Text>
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={{ color: t.text, fontWeight: '700', fontSize: 13 }}>
                    {e.item}
                  </Text>
                  <Text style={{ color: t.textMuted, fontSize: 11 }}>
                    {formatTime(e.timestamp)} • {formatDate(e.timestamp)} ({formatDay(e.timestamp).slice(0, 3)})
                  </Text>
                </View>
              </View>
              <Text style={{ color: t.accent, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{peso(e.amount)}</Text>
            </View>
          </FadeInView>
        ))}
      </FadeInView>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { padding: 16, borderRadius: 18, borderWidth: 1 },
  bannerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  small: { fontSize: 12, fontWeight: '500' },
  big: { fontSize: 26, fontWeight: '800' },
  medium: { fontSize: 18, fontWeight: '700' },
  setBudget: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  card: { padding: 18, borderRadius: 18, borderWidth: 1, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 14, fontWeight: '600' },
  label: { fontSize: 12, fontWeight: '500', marginTop: 8 },
  amountInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 24, fontWeight: '800' },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  submit: {
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  submitText: { color: '#020617', fontWeight: '700', fontSize: 16 },
  sectionTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  recent: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
});
