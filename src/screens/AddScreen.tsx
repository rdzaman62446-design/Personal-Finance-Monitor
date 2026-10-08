import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Switch, Text, TextInput, Vibration, View } from 'react-native';

import CategoryDropdown from '../components/CategoryDropdown';
import { WhenField } from '../components/DateTimeSheet';
import SavedIncomePicker from '../components/SavedIncomePicker';
import { AnimatedBar, AnimatedNumber, FadeInView, PressableScale } from '../components/motion';
import {
  categoriesFor,
  categoryIcon,
  Expense,
  formatDate,
  formatDay,
  formatTime,
  isIncome,
  Kind,
  parseAmount,
  peso,
} from '../expenses';
import { IncomeSource } from '../incomeSources';
import { ordinal } from '../recurring';
import { logText, useLogFont } from '../fonts';
import { budgetColor, Theme } from '../theme';

type Props = {
  theme: Theme;
  expenses: Expense[];
  spentToday: number;
  spentThisMonth: number;
  incomeThisMonth: number;
  monthlyBudget: number | null;
  // Past savings + all income − all spending, or null when there's nothing to show yet.
  totalSavings: number | null;
  incomeSources: IncomeSource[];
  // `at` is the chosen date & time, or null for "now".
  onAdd: (e: Omit<Expense, 'id' | 'timestamp'>, repeatMonthly: boolean, at: number | null) => void;
  onViewAll: () => void;
  onSetBudget: () => void;
  onAddIncomeSource: () => void;
};

export default function AddScreen({
  theme: t,
  expenses,
  spentToday,
  spentThisMonth,
  incomeThisMonth,
  monthlyBudget,
  totalSavings,
  incomeSources,
  onAdd,
  onViewAll,
  onSetBudget,
  onAddIncomeSource,
}: Props) {
  const font = useLogFont();
  const [kind, setKind] = useState<Kind>('expense');
  const [item, setItem] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(categoriesFor('expense')[0].name);
  const [repeat, setRepeat] = useState(false);
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [when, setWhen] = useState<number | null>(null);
  const [justAdded, setJustAdded] = useState(false);
  const [pop] = useState(() => new Animated.Value(0));
  const [today] = useState(() => new Date().getDate());

  const income = kind === 'income';
  const tint = income ? t.income : t.accent;
  const parsed = parseAmount(amount);
  const canSubmit = item.trim().length > 0 && parsed != null;

  useEffect(() => {
    if (!justAdded) return;
    const timer = setTimeout(() => setJustAdded(false), 1300);
    return () => clearTimeout(timer);
  }, [justAdded]);

  const switchKind = (next: Kind) => {
    if (next === kind) return;
    setKind(next);
    setCategory(categoriesFor(next)[0].name);
    setRepeat(false);
    setSourceId(null);
  };

  const pickSource = (src: IncomeSource) => {
    setSourceId(src.id);
    setItem(src.name);
    setAmount(src.amount.toString());
    setCategory(src.category);
  };

  const submit = () => {
    if (!canSubmit) return;
    onAdd(
      { item: item.trim(), amount: parsed, category, kind, ...(income && sourceId ? { incomeSourceId: sourceId } : {}) },
      repeat && !income,
      when,
    );
    setItem('');
    setAmount('');
    setRepeat(false);
    setSourceId(null);
    setWhen(null);
    setJustAdded(true);
    Vibration.vibrate(40);
    pop.setValue(0);
    Animated.timing(pop, { toValue: 1, duration: 500, easing: Easing.out(Easing.back(3)), useNativeDriver: true }).start();
  };

  const ratio = monthlyBudget ? spentThisMonth / monthlyBudget : 0;
  const remaining = monthlyBudget ? monthlyBudget - spentThisMonth : 0;
  const saved = incomeThisMonth - spentThisMonth;
  const checkScale = pop.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] });

  return (
    <View style={{ gap: 16 }}>
      <FadeInView>
        <View style={[styles.banner, { backgroundColor: t.card, borderColor: t.border }]}>
          <View style={styles.bannerRow}>
            <View>
              <Text style={[styles.small, { color: t.textMuted }]}>Spent Today</Text>
              <AnimatedNumber value={spentToday} format={peso} style={[styles.big, { color: t.accent }]} />
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.small, { color: t.textMuted }]}>This Month</Text>
              <AnimatedNumber value={spentThisMonth} format={peso} style={[styles.medium, { color: t.text }]} />
            </View>
          </View>

          {incomeThisMonth > 0 && (
            <View style={[styles.incomeRow, { borderTopColor: t.border }]}>
              <Text style={{ color: t.textMuted, fontSize: 12 }}>
                Income <Text style={{ color: t.income, fontWeight: '700' }}>{peso(incomeThisMonth)}</Text>
              </Text>
              <Text style={{ color: t.textMuted, fontSize: 12 }}>
                {saved >= 0 ? 'Saved ' : 'Short '}
                <Text style={{ color: saved >= 0 ? t.accent : t.danger, fontWeight: '700' }}>{peso(Math.abs(saved))}</Text>
              </Text>
            </View>
          )}

          {totalSavings != null && (
            <View style={[styles.savingsRow, { backgroundColor: t.accentSoft }]}>
              <Text style={{ color: t.textMuted, fontSize: 12 }}>🏦 Total savings</Text>
              <AnimatedNumber
                value={totalSavings}
                format={(n) => (n < 0 ? '−' : '') + peso(Math.abs(n))}
                style={{ color: totalSavings >= 0 ? t.accent : t.danger, fontWeight: '800', fontSize: 13 }}
              />
            </View>
          )}

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
          <KindToggle theme={t} kind={kind} onChange={switchKind} />

          {income && (
            <>
              <Text style={[styles.label, { color: t.textMuted }]}>Saved incomes</Text>
              <SavedIncomePicker
                theme={t}
                sources={incomeSources}
                entries={expenses}
                selectedId={sourceId}
                onPick={pickSource}
                onAddNew={onAddIncomeSource}
              />
            </>
          )}

          <Text style={[styles.label, { color: t.textMuted }]}>How much? (₱)</Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            placeholderTextColor={t.textFaint}
            keyboardType="decimal-pad"
            style={[styles.amountInput, { backgroundColor: t.input, borderColor: income ? t.income : t.border, color: t.text }]}
          />

          <Text style={[styles.label, { color: t.textMuted }]}>{income ? 'Where is it from?' : 'What did you spend on?'}</Text>
          <TextInput
            value={item}
            onChangeText={setItem}
            placeholder={income ? 'e.g. October salary, Project payment' : 'e.g. Commute, Dinner, Groceries'}
            placeholderTextColor={t.textFaint}
            returnKeyType="done"
            onSubmitEditing={submit}
            style={[styles.input, { backgroundColor: t.input, borderColor: t.border, color: t.text }]}
          />

          <Text style={[styles.label, { color: t.textMuted }]}>When</Text>
          <WhenField theme={t} value={when} onChange={setWhen} />

          <Text style={[styles.label, { color: t.textMuted }]}>Category</Text>
          <CategoryDropdown theme={t} value={category} onChange={setCategory} options={categoriesFor(kind)} />

          {!income && (
            <Pressable onPress={() => setRepeat(!repeat)} style={[styles.repeatRow, { borderColor: repeat ? t.accent : t.border }]}>
              <Feather name="repeat" size={16} color={repeat ? t.accent : t.textMuted} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: t.text, fontSize: 13, fontWeight: '600' }}>Repeat monthly</Text>
                <Text style={{ color: t.textMuted, fontSize: 11 }}>
                  {repeat
                    ? `Logged automatically on the ${ordinal(when ? new Date(when).getDate() : today)} of every month`
                    : 'For rent, bills and subscriptions'}
                </Text>
              </View>
              <Switch
                value={repeat}
                onValueChange={setRepeat}
                trackColor={{ true: t.accent, false: t.border }}
                thumbColor="#ffffff"
              />
            </Pressable>
          )}

          <PressableScale
            onPress={submit}
            disabled={!canSubmit && !justAdded}
            style={[styles.submit, { backgroundColor: tint, opacity: canSubmit || justAdded ? 1 : 0.5 }]}
          >
            {justAdded ? (
              <Animated.View style={[styles.row, { transform: [{ scale: checkScale }] }]}>
                <Feather name="check-circle" size={20} color="#020617" />
                <Text style={styles.submitText}>Added!</Text>
              </Animated.View>
            ) : (
              <>
                <Feather name="plus" size={20} color="#020617" />
                <Text style={styles.submitText}>{income ? 'Add Income' : repeat ? 'Add Monthly Expense' : 'Add Expense'}</Text>
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
            Nothing logged yet. Add your first entry above.
          </Text>
        )}
        {expenses.slice(0, 3).map((e) => (
          <FadeInView key={e.id} from={-10}>
            <View style={[styles.recent, { backgroundColor: t.card, borderColor: t.border }]}>
              <View style={[styles.row, { flex: 1 }]}>
                <Text style={{ fontSize: 18 }}>{categoryIcon(e.category)}</Text>
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={[logText(font, true, 13), { color: t.text }]}>
                    {e.item}
                    {e.recurringId ? '  🔁' : ''}
                  </Text>
                  <Text style={[logText(font, false, 11), { color: t.textMuted }]}>
                    {formatTime(e.timestamp)} • {formatDate(e.timestamp)} ({formatDay(e.timestamp).slice(0, 3)})
                  </Text>
                </View>
              </View>
              <Text style={[logText(font, true, 14), { color: isIncome(e) ? t.income : t.accent, fontVariant: ['tabular-nums'] }]}>
                {isIncome(e) ? '+' : ''}
                {peso(e.amount)}
              </Text>
            </View>
          </FadeInView>
        ))}
      </FadeInView>
    </View>
  );
}

// Expense / Income switch with a pill that slides between the two.
function KindToggle({ theme: t, kind, onChange }: { theme: Theme; kind: Kind; onChange: (k: Kind) => void }) {
  const [width, setWidth] = useState(0);
  const [pos] = useState(() => new Animated.Value(kind === 'income' ? 1 : 0));

  useEffect(() => {
    Animated.spring(pos, { toValue: kind === 'income' ? 1 : 0, useNativeDriver: true, speed: 18, bounciness: 8 }).start();
  }, [kind, pos]);

  const half = width / 2;
  const option = (k: Kind, label: string, icon: keyof typeof Feather.glyphMap) => {
    const active = kind === k;
    const color = active ? '#020617' : t.textMuted;
    return (
      <Pressable key={k} onPress={() => onChange(k)} style={styles.toggleBtn}>
        <Feather name={icon} size={15} color={color} />
        <Text style={{ color, fontWeight: '700', fontSize: 13 }}>{label}</Text>
      </Pressable>
    );
  };

  return (
    <View
      style={[styles.toggle, { backgroundColor: t.input, borderColor: t.border }]}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width - 8)}
    >
      {width > 0 && (
        <Animated.View
          style={[
            styles.togglePill,
            {
              width: half,
              backgroundColor: kind === 'income' ? t.income : t.accent,
              transform: [{ translateX: Animated.multiply(pos, half) }],
            },
          ]}
        />
      )}
      {option('expense', 'Expense', 'arrow-up-right')}
      {option('income', 'Income', 'arrow-down-left')}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { padding: 16, borderRadius: 18, borderWidth: 1 },
  bannerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  incomeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  savingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
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
  label: { fontSize: 12, fontWeight: '500', marginTop: 8 },
  amountInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 24, fontWeight: '800' },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  repeatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  toggle: { flexDirection: 'row', padding: 4, borderRadius: 14, borderWidth: 1 },
  togglePill: { position: 'absolute', top: 4, bottom: 4, left: 4, borderRadius: 10 },
  toggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 },
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
