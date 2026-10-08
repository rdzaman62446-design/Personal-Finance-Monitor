import { Feather } from '@expo/vector-icons';
import { ReactNode, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { ColumnChart3D } from '../components/charts/ColumnChart3D';
import Gauge3D from '../components/charts/Gauge3D';
import HBarChart3D from '../components/charts/HBarChart3D';
import LineChart3D from '../components/charts/LineChart3D';
import Pie3D from '../components/charts/Pie3D';
import EntryList from '../components/EntryList';
import { AnimatedBar, AnimatedNumber, FadeInView, PressableScale } from '../components/motion';
import {
  categoryColor,
  categoryIcon,
  daysInMonth,
  Expense,
  isIncome,
  isInMonth,
  Month,
  monthLabel,
  monthOf,
  parseMonthKey,
  peso,
  sameMonth,
  shiftMonth,
  totalIncome,
  totalSpent,
} from '../expenses';
import { Goal, perMonthNeeded } from '../goals';
import { IncomeSource, isDueOn, scheduleLabel } from '../incomeSources';
import { ordinal, Recurring } from '../recurring';
import { budgetColor, Theme } from '../theme';

type Props = {
  theme: Theme;
  expenses: Expense[];
  monthlyBudget: number | null;
  categoryBudgets: Record<string, number>;
  recurring: Recurring[];
  incomeSources: IncomeSource[];
  pastSavings: number | null;
  goals: Goal[];
  onEditGoal: (goal: Goal | null) => void;
  onOpenSummary: (month: Month) => void;
  onEditPastSavings: () => void;
  onEditIncomeSource: (source: IncomeSource | null) => void;
  onSetBudget: () => void;
  onSetCategoryBudget: (category: string) => void;
  onDeleteRecurring: (rule: Recurring) => void;
  onEditEntry: (e: Expense) => void;
};

export default function StatsScreen({
  theme: t,
  expenses,
  monthlyBudget,
  categoryBudgets,
  recurring,
  incomeSources,
  pastSavings,
  goals,
  onEditGoal,
  onOpenSummary,
  onEditPastSavings,
  onEditIncomeSource,
  onSetBudget,
  onSetCategoryBudget,
  onDeleteRecurring,
  onEditEntry,
}: Props) {
  const [thisMonth] = useState(() => monthOf(Date.now()));
  const [todayOfMonth] = useState(() => new Date().getDate());
  const [month, setMonth] = useState<Month>(thisMonth);
  const isCurrent = sameMonth(month, thisMonth);

  const monthEntries = useMemo(() => expenses.filter((e) => isInMonth(e.timestamp, month)), [expenses, month]);
  const spent = totalSpent(monthEntries);
  const income = totalIncome(monthEntries);
  const saved = income - spent;
  const prevSpent = useMemo(
    () => totalSpent(expenses.filter((e) => isInMonth(e.timestamp, shiftMonth(month, -1)))),
    [expenses, month],
  );
  // For the current month, average over the days so far; for past months, over the whole month.
  const daysCounted = isCurrent ? todayOfMonth : daysInMonth(month);
  const dailyAvg = spent / daysCounted;
  const change = prevSpent > 0 ? ((spent - prevSpent) / prevSpent) * 100 : null;
  const expenseCount = monthEntries.filter((e) => !isIncome(e)).length;

  const monthId = `${month.year}-${month.month}`;
  const recurringTotal = recurring.reduce((s, r) => s + r.amount, 0);
  const allIncome = totalIncome(expenses);
  const allSpent = totalSpent(expenses);
  const totalSavings = (pastSavings ?? 0) + allIncome - allSpent;
  const [nowTs] = useState(() => Date.now());

  const confirmDeleteRecurring = (r: Recurring) =>
    Alert.alert(
      'Stop this monthly expense?',
      `"${r.item}" won't be logged in future months. Entries already logged stay.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Stop', style: 'destructive', onPress: () => onDeleteRecurring(r) },
      ],
    );

  const header = (icon: keyof typeof Feather.glyphMap, title: string, right?: string) => (
    <View style={styles.cardHeader}>
      <View style={styles.row}>
        <Feather name={icon} size={16} color={t.accent} />
        <Text style={[styles.cardTitle, { color: t.text }]}>{title}</Text>
      </View>
      {right && <Text style={{ color: t.textMuted, fontSize: 12 }}>{right}</Text>}
    </View>
  );

  return (
    <View style={{ gap: 16 }}>
      <FadeInView>
        <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
          {header('trending-up', 'Total Savings')}
          <AnimatedNumber
            value={totalSavings}
            format={(n) => (n < 0 ? '−' : '') + peso(Math.abs(n))}
            style={{ color: totalSavings >= 0 ? t.accent : t.danger, fontSize: 28, fontWeight: '800' }}
          />
          <View style={{ gap: 6 }}>
            <Pressable onPress={onEditPastSavings} style={styles.savingsLine}>
              <Text style={{ color: t.textMuted, fontSize: 12 }}>Savings before SpendTrack</Text>
              <View style={styles.row}>
                <Text style={{ color: t.text, fontSize: 12, fontWeight: '600' }}>{peso(pastSavings ?? 0)}</Text>
                <Feather name="edit-2" size={12} color={t.accent} />
              </View>
            </Pressable>
            <View style={styles.savingsLine}>
              <Text style={{ color: t.textMuted, fontSize: 12 }}>+ All income logged</Text>
              <Text style={{ color: t.income, fontSize: 12, fontWeight: '600' }}>{peso(allIncome)}</Text>
            </View>
            <View style={styles.savingsLine}>
              <Text style={{ color: t.textMuted, fontSize: 12 }}>− All spending logged</Text>
              <Text style={{ color: t.accent, fontSize: 12, fontWeight: '600' }}>{peso(allSpent)}</Text>
            </View>
          </View>
          {pastSavings == null && (
            <PressableScale onPress={onEditPastSavings} style={[styles.dashed, { borderColor: t.accent }]}>
              <Feather name="plus" size={14} color={t.accent} />
              <Text style={{ color: t.accent, fontSize: 12, fontWeight: '600' }}>Add savings you already had</Text>
            </PressableScale>
          )}
        </View>
      </FadeInView>

      <FadeInView delay={60}>
        <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
          <View style={styles.cardHeader}>
            <View style={styles.row}>
              <Feather name="flag" size={16} color={t.accent} />
              <Text style={[styles.cardTitle, { color: t.text }]}>Savings Goals</Text>
            </View>
            <Pressable hitSlop={10} onPress={() => onEditGoal(null)} style={styles.row}>
              <Feather name="plus" size={14} color={t.accent} />
              <Text style={{ color: t.accent, fontSize: 12, fontWeight: '700' }}>New goal</Text>
            </Pressable>
          </View>
          {goals.length === 0 ? (
            <Text style={{ color: t.textMuted, fontSize: 12 }}>
              Saving up for something? Create a goal like “New phone ₱25,000” and add money to it as you save.
            </Text>
          ) : (
            goals.map((g, i) => {
              const pct = Math.min(100, (g.saved / g.target) * 100);
              const done = g.saved >= g.target;
              const perMonth = perMonthNeeded(g, nowTs);
              return (
                <Pressable key={g.id} onPress={() => onEditGoal(g)} style={({ pressed }) => [{ gap: 6, opacity: pressed ? 0.6 : 1 }]}>
                  <View style={styles.cardHeader}>
                    <Text numberOfLines={1} style={{ flex: 1, color: t.text, fontSize: 13, fontWeight: '600' }}>
                      {g.icon} {g.name}
                    </Text>
                    <Text style={{ color: done ? t.accent : t.textMuted, fontSize: 12, fontWeight: done ? '800' : '400' }}>
                      {done ? '🎉 Reached!' : `${peso(g.saved)} / ${peso(g.target)}`}
                    </Text>
                  </View>
                  <AnimatedBar percent={pct} color={done ? t.amber : t.accent} trackColor={t.border} height={10} delay={120 + i * 80} />
                  <Text style={{ color: t.textFaint, fontSize: 11 }}>
                    {done
                      ? `${peso(g.saved)} saved`
                      : `${pct.toFixed(0)}% · ${peso(g.target - g.saved)} to go${perMonth != null ? ` · ${peso(perMonth)}/month to finish by ${monthLabel(parseMonthKey(g.deadline!))}` : ''}`}
                  </Text>
                </Pressable>
              );
            })
          )}
        </View>
      </FadeInView>

      <View style={[styles.monthBar, { backgroundColor: t.card, borderColor: t.border }]}>
        <PressableScale hitSlop={10} onPress={() => setMonth(shiftMonth(month, -1))} style={styles.arrow}>
          <Feather name="chevron-left" size={20} color={t.text} />
        </PressableScale>
        <Pressable onPress={() => setMonth(thisMonth)}>
          <Text style={{ color: t.text, fontWeight: '700', fontSize: 15 }}>{monthLabel(month)}</Text>
          {!isCurrent && <Text style={{ color: t.accent, fontSize: 10, textAlign: 'center' }}>Tap for this month</Text>}
        </Pressable>
        <PressableScale
          hitSlop={10}
          disabled={isCurrent}
          onPress={() => setMonth(shiftMonth(month, 1))}
          style={[styles.arrow, { opacity: isCurrent ? 0.3 : 1 }]}
        >
          <Feather name="chevron-right" size={20} color={t.text} />
        </PressableScale>
      </View>

      <PressableScale onPress={() => onOpenSummary(month)} style={[styles.summaryBtn, { borderColor: t.accent, backgroundColor: t.accentSoft }]}>
        <Feather name="award" size={16} color={t.accent} />
        <Text style={{ color: t.accent, fontWeight: '700', fontSize: 13 }}>
          {isCurrent ? 'This month’s summary' : `${monthLabel(month)} summary`}
        </Text>
        <Feather name="share-2" size={14} color={t.accent} />
      </PressableScale>

      {/* Re-keyed per month so the charts animate in and their selections reset when switching months. */}
      <MonthCharts
        key={monthId}
        theme={t}
        expenses={expenses}
        monthEntries={monthEntries}
        month={month}
        isCurrent={isCurrent}
        todayOfMonth={todayOfMonth}
        spent={spent}
        income={income}
        saved={saved}
        change={change}
        dailyAvg={dailyAvg}
        daysCounted={daysCounted}
        expenseCount={expenseCount}
        monthlyBudget={monthlyBudget}
        categoryBudgets={categoryBudgets}
        onSetBudget={onSetBudget}
        onSetCategoryBudget={onSetCategoryBudget}
        onPickMonth={setMonth}
        onEditEntry={onEditEntry}
      />

      <FadeInView delay={300}>
        <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
          <View style={styles.cardHeader}>
            <View style={styles.row}>
              <Feather name="briefcase" size={16} color={t.income} />
              <Text style={[styles.cardTitle, { color: t.text }]}>Income Sources</Text>
            </View>
            <Pressable hitSlop={10} onPress={() => onEditIncomeSource(null)} style={styles.row}>
              <Feather name="plus" size={14} color={t.income} />
              <Text style={{ color: t.income, fontSize: 12, fontWeight: '700' }}>Add</Text>
            </Pressable>
          </View>
          {incomeSources.length === 0 ? (
            <Text style={{ color: t.textMuted, fontSize: 12 }}>
              Save each job or regular income (e.g. “Job A – 15th pay”, weekly freelance). On payday just pick it from
              the Income form.
            </Text>
          ) : (
            incomeSources.map((src) => (
              <Pressable
                key={src.id}
                onPress={() => onEditIncomeSource(src)}
                style={({ pressed }) => [styles.recurringRow, { borderColor: t.border, opacity: pressed ? 0.6 : 1 }]}
              >
                <Text style={{ fontSize: 18 }}>{categoryIcon(src.category)}</Text>
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={{ color: t.text, fontSize: 13, fontWeight: '600' }}>
                    {src.name}
                  </Text>
                  <Text style={{ color: t.textMuted, fontSize: 11 }}>
                    {scheduleLabel(src)}
                    {isDueOn(src, nowTs) ? ' · due today' : ''}
                  </Text>
                </View>
                <Text style={{ color: t.income, fontWeight: '700' }}>{peso(src.amount)}</Text>
                <Feather name="chevron-right" size={16} color={t.textFaint} />
              </Pressable>
            ))
          )}
        </View>
      </FadeInView>

      <FadeInView delay={320}>
        <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
          {header('repeat', 'Monthly Expenses', recurring.length ? `${peso(recurringTotal)} / month` : undefined)}
          {recurring.length === 0 ? (
            <Text style={{ color: t.textMuted, fontSize: 12 }}>
              Turn on “Repeat monthly” when adding rent, bills or subscriptions and they’ll be logged automatically.
            </Text>
          ) : (
            recurring.map((r) => (
              <View key={r.id} style={[styles.recurringRow, { borderColor: t.border }]}>
                <Text style={{ fontSize: 18 }}>{categoryIcon(r.category)}</Text>
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={{ color: t.text, fontSize: 13, fontWeight: '600' }}>
                    {r.item}
                  </Text>
                  <Text style={{ color: t.textMuted, fontSize: 11 }}>Every {ordinal(r.day)} of the month</Text>
                </View>
                <Text style={{ color: t.accent, fontWeight: '700' }}>{peso(r.amount)}</Text>
                <Pressable hitSlop={10} onPress={() => confirmDeleteRecurring(r)}>
                  <Feather name="x" size={18} color={t.textFaint} />
                </Pressable>
              </View>
            ))
          )}
        </View>
      </FadeInView>

    </View>
  );
}

// Short amounts for chart labels: ₱850, ₱1.2k, ₱15k.
const shortPeso = (n: number) =>
  n >= 10000 ? `₱${Math.round(n / 1000)}k` : n >= 1000 ? `₱${(n / 1000).toFixed(1)}k` : `₱${Math.round(n)}`;

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

type ChartsProps = {
  theme: Theme;
  expenses: Expense[];
  monthEntries: Expense[];
  month: Month;
  isCurrent: boolean;
  todayOfMonth: number;
  spent: number;
  income: number;
  saved: number;
  change: number | null;
  dailyAvg: number;
  daysCounted: number;
  expenseCount: number;
  monthlyBudget: number | null;
  categoryBudgets: Record<string, number>;
  onSetBudget: () => void;
  onSetCategoryBudget: (category: string) => void;
  onPickMonth: (m: Month) => void;
  onEditEntry: (e: Expense) => void;
};

// The month's charts. Each is a different chart type; tapping one shows the matching entries below it.
function MonthCharts({
  theme: t,
  expenses,
  monthEntries,
  month,
  isCurrent,
  todayOfMonth,
  spent,
  income,
  saved,
  change,
  dailyAvg,
  daysCounted,
  expenseCount,
  monthlyBudget,
  categoryBudgets,
  onSetBudget,
  onSetCategoryBudget,
  onPickMonth,
  onEditEntry,
}: ChartsProps) {
  const [overviewSel, setOverviewSel] = useState<string | null>(null);
  const [categorySel, setCategorySel] = useState<string | null>(null);
  const [daySel, setDaySel] = useState<string | null>(null);

  const spending = useMemo(() => monthEntries.filter((e) => !isIncome(e)), [monthEntries]);
  const incomes = useMemo(() => monthEntries.filter((e) => isIncome(e)), [monthEntries]);

  const categories = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of spending) map[e.category] = (map[e.category] ?? 0) + e.amount;
    return Object.entries(map)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
  }, [spending]);

  const days = daysInMonth(month);
  const daily = useMemo(() => {
    const arr = new Array(days).fill(0) as number[];
    for (const e of spending) arr[new Date(e.timestamp).getDate() - 1] += e.amount;
    return arr;
  }, [spending, days]);

  const trend = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => shiftMonth(month, i - 5)).map((m) => ({
        m,
        spent: totalSpent(expenses.filter((e) => isInMonth(e.timestamp, m))),
      })),
    [expenses, month],
  );

  const ratio = monthlyBudget ? spent / monthlyBudget : 0;
  const selectedCategory = categories.find((c) => c.name === categorySel);
  const catBudget = selectedCategory && isCurrent ? categoryBudgets[selectedCategory.name] : undefined;
  const dayNumber = daySel ? parseInt(daySel, 10) : null;

  const card = (children: ReactNode, delay: number) => (
    <FadeInView delay={delay}>
      <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>{children}</View>
    </FadeInView>
  );
  const title = (icon: keyof typeof Feather.glyphMap, text: string, hint?: string) => (
    <View style={styles.cardHeader}>
      <View style={styles.row}>
        <Feather name={icon} size={16} color={t.accent} />
        <Text style={[styles.cardTitle, { color: t.text }]}>{text}</Text>
      </View>
      {hint && <Text style={{ color: t.textFaint, fontSize: 11 }}>{hint}</Text>}
    </View>
  );

  return (
    <View style={{ gap: 16 }}>
      {/* Headline numbers as a compact strip. */}
      <FadeInView>
        <View style={[styles.strip, { backgroundColor: t.card, borderColor: t.border }]}>
          <StripItem theme={t} label="Daily avg" value={shortPeso(dailyAvg)} sub={`${daysCounted} days`} color={t.amber} />
          <View style={[styles.stripDivider, { backgroundColor: t.border }]} />
          <StripItem theme={t} label="Entries" value={String(monthEntries.length)} sub={`${expenseCount} expenses`} color={t.text} />
          <View style={[styles.stripDivider, { backgroundColor: t.border }]} />
          <StripItem
            theme={t}
            label="vs last month"
            value={change == null ? '—' : `${change > 0 ? '▲' : '▼'}${Math.abs(change).toFixed(0)}%`}
            sub={change == null ? 'no data' : change > 0 ? 'more spent' : 'less spent'}
            color={change == null ? t.textMuted : change > 0 ? t.danger : t.accent}
          />
        </View>
      </FadeInView>

      {/* 1. Overview — 3D columns */}
      {card(
        <>
          {title('layers', 'Overview', 'tap a column')}
          <ColumnChart3D
            theme={t}
            items={[
              { key: 'spent', value: spent, color: t.accent, top: shortPeso(spent), caption: 'Spent' },
              { key: 'income', value: income, color: t.income, top: shortPeso(income), caption: 'Income' },
              {
                key: 'saved',
                value: Math.abs(saved),
                color: saved >= 0 ? t.amber : t.danger,
                top: `${saved < 0 ? '−' : ''}${shortPeso(Math.abs(saved))}`,
                caption: saved >= 0 ? 'Saved' : 'Short',
              },
            ]}
            height={120}
            barWidth={46}
            depth={14}
            gap={34}
            selectedKey={overviewSel}
            onSelect={setOverviewSel}
          />
          {overviewSel === 'spent' && (
            <EntryList theme={t} title={`BIGGEST EXPENSES · ${peso(spent)}`} entries={[...spending].sort((a, b) => b.amount - a.amount)} onEdit={onEditEntry} />
          )}
          {overviewSel === 'income' && (
            <EntryList theme={t} title={`INCOME · ${peso(income)}`} entries={incomes} onEdit={onEditEntry} />
          )}
          {overviewSel === 'saved' && (
            <FadeInView from={-8} style={[styles.note, { backgroundColor: t.cardAlt, borderColor: t.border }]}>
              <Text style={{ color: t.textMuted, fontSize: 12 }}>
                {income > 0
                  ? `${peso(income)} income − ${peso(spent)} spent = ${saved < 0 ? '−' : ''}${peso(Math.abs(saved))} (${((saved / income) * 100).toFixed(0)}% of income)`
                  : 'Log your income to see how much you saved this month.'}
              </Text>
            </FadeInView>
          )}
        </>,
        60,
      )}

      {/* 2. Budget — 3D gauge */}
      {isCurrent &&
        card(
          <Pressable onPress={onSetBudget} style={{ gap: 10 }}>
            {title('target', 'Monthly Budget', monthlyBudget ? 'tap to edit' : 'tap to set')}
            {monthlyBudget ? (
              <Gauge3D
                theme={t}
                ratio={ratio}
                color={budgetColor(t, ratio)}
                center={`${Math.round(ratio * 100)}%`}
                caption={ratio <= 1 ? `${peso(monthlyBudget - spent)} left of ${shortPeso(monthlyBudget)}` : `${peso(spent - monthlyBudget)} over budget`}
              />
            ) : (
              <Text style={{ color: t.textMuted, fontSize: 12 }}>Set a monthly limit to get a spending gauge here.</Text>
            )}
          </Pressable>,
          120,
        )}

      {/* 3. By category — 3D pie */}
      {card(
        <>
          {title('pie-chart', 'By Category', categories.length ? 'tap a slice' : undefined)}
          {categories.length === 0 ? (
            <Text style={{ color: t.textFaint, fontSize: 12, textAlign: 'center', paddingVertical: 12 }}>No spending in {monthLabel(month)}.</Text>
          ) : (
            <>
              <Pie3D
                theme={t}
                slices={categories.map((c) => ({ key: c.name, value: c.total, color: categoryColor(c.name), label: categoryIcon(c.name) }))}
                selectedKey={categorySel}
                onSelect={setCategorySel}
              />
              {/* Legend doubles as a slice picker. */}
              <View style={styles.legend}>
                {categories.map((c) => {
                  const active = c.name === categorySel;
                  return (
                    <Pressable
                      key={c.name}
                      onPress={() => setCategorySel(active ? null : c.name)}
                      style={[styles.legendItem, { borderColor: active ? categoryColor(c.name) : t.border, backgroundColor: active ? t.cardAlt : 'transparent' }]}
                    >
                      <View style={[styles.dot, { backgroundColor: categoryColor(c.name) }]} />
                      <Text numberOfLines={1} style={{ color: t.text, fontSize: 11, fontWeight: active ? '800' : '500', flexShrink: 1 }}>
                        {categoryIcon(c.name)} {c.name}
                      </Text>
                      <Text style={{ color: t.textMuted, fontSize: 11 }}>{shortPeso(c.total)}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}
          {selectedCategory && (
            <FadeInView from={-8} style={{ gap: 8 }}>
              {isCurrent && (
                <Pressable onPress={() => onSetCategoryBudget(selectedCategory.name)} style={[styles.note, { backgroundColor: t.cardAlt, borderColor: t.border, gap: 6 }]}>
                  <View style={styles.cardHeader}>
                    <Text style={{ color: t.text, fontSize: 12, fontWeight: '700' }}>
                      {catBudget ? `Budget: ${peso(selectedCategory.total)} of ${peso(catBudget)}` : `No budget for ${selectedCategory.name}`}
                    </Text>
                    <Text style={{ color: t.accent, fontSize: 12, fontWeight: '700' }}>{catBudget ? 'Edit' : 'Set budget'}</Text>
                  </View>
                  {catBudget != null && (
                    <AnimatedBar
                      percent={(selectedCategory.total / catBudget) * 100}
                      color={budgetColor(t, selectedCategory.total / catBudget)}
                      trackColor={t.border}
                    />
                  )}
                </Pressable>
              )}
              <EntryList
                theme={t}
                title={`${categoryIcon(selectedCategory.name)} ${selectedCategory.name.toUpperCase()} · ${peso(selectedCategory.total)} · ${spent > 0 ? Math.round((selectedCategory.total / spent) * 100) : 0}%`}
                entries={spending.filter((e) => e.category === selectedCategory.name)}
                onEdit={onEditEntry}
              />
            </FadeInView>
          )}
        </>,
        180,
      )}

      {/* 4. Daily — raised line & area */}
      {card(
        <>
          {title('activity', 'Daily Spending', 'tap a day')}
          <LineChart3D
            theme={t}
            points={daily.map((v, i) => ({ key: String(i + 1), value: v, label: String(i + 1) }))}
            color={t.accent}
            selectedKey={daySel}
            onSelect={setDaySel}
            highlightKey={isCurrent ? String(todayOfMonth) : null}
            formatValue={(v) => peso(v)}
            axisLabels={[0, 4, 9, 14, 19, 24, days - 1]}
          />
          {dayNumber != null && (
            <EntryList
              theme={t}
              title={`${new Date(month.year, month.month, dayNumber).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).toUpperCase()} · ${peso(daily[dayNumber - 1])}`}
              entries={monthEntries.filter((e) => new Date(e.timestamp).getDate() === dayNumber)}
              onEdit={onEditEntry}
            />
          )}
        </>,
        240,
      )}

      {/* 5. Six-month trend — horizontal 3D bars */}
      {card(
        <>
          {title('trending-up', '6-Month Trend', 'tap to open month')}
          <HBarChart3D
            theme={t}
            rows={trend.map(({ m, spent: v }) => ({
              key: `${m.year}-${m.month}`,
              label: MONTH_SHORT[m.month],
              value: v,
              color: t.accent,
              valueLabel: shortPeso(v),
            }))}
            selectedKey={`${month.year}-${month.month}`}
            onSelect={(key) => {
              const [y, mo] = key.split('-').map(Number);
              onPickMonth({ year: y, month: mo });
            }}
          />
        </>,
        300,
      )}
    </View>
  );
}

function StripItem({ theme: t, label, value, sub, color }: { theme: Theme; label: string; value: string; sub: string; color: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={{ color: t.textFaint, fontSize: 10 }}>{label}</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit style={{ color, fontSize: 16, fontWeight: '800' }}>
        {value}
      </Text>
      <Text style={{ color: t.textFaint, fontSize: 10 }}>{sub}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  monthBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  arrow: { padding: 8 },
  card: { padding: 18, borderRadius: 18, borderWidth: 1, gap: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontWeight: '600', fontSize: 14 },
  strip: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderRadius: 16, borderWidth: 1 },
  stripDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch' },
  note: { padding: 12, borderRadius: 12, borderWidth: 1 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999, borderWidth: 1, maxWidth: '100%' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  summaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1,
  },
  savingsLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dashed: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  recurringRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
