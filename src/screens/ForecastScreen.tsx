import { Feather } from '@expo/vector-icons';
import { ReactNode, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import Bars3D from '../components/charts/Bars3D';
import InnerHorizontalScroll from '../components/InnerHorizontalScroll';
import { AnimatedNumber, FadeInView, PressableScale } from '../components/motion';
import { Month, monthLabel, monthOf, peso } from '../expenses';
import { isOverridden, lineAmount, Plan, PlanLine, runForecast } from '../forecast';
import { WEEKDAYS } from '../incomeSources';
import { Theme } from '../theme';

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const shortPeso = (n: number) => {
  const a = Math.abs(n);
  const s = a >= 10000 ? `${Math.round(a / 1000)}k` : a >= 1000 ? `${(a / 1000).toFixed(1)}k` : `${Math.round(a)}`;
  return `${n < 0 ? '−' : ''}₱${s}`;
};
const signedPeso = (n: number) => `${n < 0 ? '−' : '+'}${peso(Math.abs(n))}`;

type Props = {
  theme: Theme;
  plan: Plan;
  // Current total savings, used as the starting balance unless the user sets one.
  totalSavings: number;
  importable: number;
  onEditLine: (line: PlanLine | { kind: PlanLine['kind'] }) => void;
  onEditCell: (line: PlanLine, month: Month) => void;
  onSetMonths: (n: number) => void;
  onEditStart: () => void;
  onImport: () => void;
};

// "Assumed savings" planner: usual income and must-pay expenses per month, and the balance they lead to.
export default function ForecastScreen({ theme: t, plan, totalSavings, importable, onEditLine, onEditCell, onSetMonths, onEditStart, onImport }: Props) {
  const [from] = useState(() => monthOf(Date.now()));
  const start = plan.start ?? totalSavings;
  const rows = useMemo(() => runForecast(plan, start, from), [plan, start, from]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const selected = rows.find((r) => r.key === selectedKey) ?? rows[rows.length - 1];

  const incomes = plan.lines.filter((l) => l.kind === 'income');
  const expenses = plan.lines.filter((l) => l.kind === 'expense');

  const card = (children: ReactNode, delay: number) => (
    <FadeInView delay={delay}>
      <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>{children}</View>
    </FadeInView>
  );

  // ----- table -----
  const NAME_W = 118;
  const CELL_W = 74;
  const cell = (text: string, opts: { color?: string; bold?: boolean; marked?: boolean; onPress?: () => void; bg?: string } = {}) => (
    <Pressable
      onPress={opts.onPress}
      disabled={!opts.onPress}
      style={[styles.cell, { width: CELL_W, backgroundColor: opts.bg, borderColor: opts.marked ? t.amber : 'transparent' }]}
    >
      <Text numberOfLines={1} style={{ color: opts.color ?? t.text, fontSize: 12, fontWeight: opts.bold ? '800' : '500' }}>
        {text}
      </Text>
    </Pressable>
  );
  const nameCell = (text: string, opts: { color?: string; bold?: boolean; sub?: string; onPress?: () => void } = {}) => (
    <Pressable onPress={opts.onPress} disabled={!opts.onPress} style={[styles.nameCell, { width: NAME_W }]}>
      <Text numberOfLines={1} style={{ color: opts.color ?? t.text, fontSize: 12, fontWeight: opts.bold ? '800' : '600' }}>
        {text}
      </Text>
      {opts.sub && <Text style={{ color: t.textFaint, fontSize: 9 }}>{opts.sub}</Text>}
    </Pressable>
  );
  const lineRow = (line: PlanLine) => (
    <View key={line.id} style={[styles.tRow, { borderBottomColor: t.border }]}>
      {nameCell(line.name, {
        onPress: () => onEditLine(line),
        sub: line.weekday != null ? `${peso(line.amount)} × ${WEEKDAYS[line.weekday]}` : undefined,
      })}
      {rows.map((r) => {
        const v = lineAmount(plan, line, r.month);
        return (
          <View key={r.key}>
            {cell(v === 0 ? '—' : shortPeso(v), {
              color: v === 0 ? t.textFaint : line.kind === 'income' ? t.income : t.text,
              marked: isOverridden(plan, line, r.month),
              onPress: () => onEditCell(line, r.month),
            })}
          </View>
        );
      })}
    </View>
  );
  const totalRow = (label: string, values: number[], color: string, bg?: string) => (
    <View style={[styles.tRow, { backgroundColor: bg }]}>
      {nameCell(label, { color, bold: true })}
      {values.map((v, i) => (
        <View key={i}>{cell(shortPeso(v), { color, bold: true })}</View>
      ))}
    </View>
  );
  const sectionRow = (label: string, color: string, kind: PlanLine['kind']) => (
    <View style={styles.tRow}>
      <Pressable onPress={() => onEditLine({ kind })} style={[styles.nameCell, styles.row, { width: NAME_W }]}>
        <Text style={{ color, fontSize: 10, fontWeight: '800', letterSpacing: 1 }}>{label}</Text>
        <Feather name="plus-circle" size={13} color={color} />
      </Pressable>
    </View>
  );

  return (
    <View style={{ gap: 16 }}>
      {/* Headline: what you'll have by the chosen month. */}
      {card(
        <>
          <Pressable onPress={onEditStart} style={styles.startRow}>
            <Text style={{ color: t.textMuted, fontSize: 12 }}>Starting money now</Text>
            <View style={styles.row}>
              <Text style={{ color: t.text, fontWeight: '700', fontSize: 13 }}>{peso(start)}</Text>
              <Text style={{ color: t.textFaint, fontSize: 10 }}>{plan.start == null ? '(total savings)' : '(custom)'}</Text>
              <Feather name="edit-2" size={12} color={t.accent} />
            </View>
          </Pressable>
          {selected ? (
            <>
              <Text style={{ color: t.textMuted, fontSize: 13 }}>By end of {monthLabel(selected.month)} you’ll have</Text>
              <AnimatedNumber
                value={selected.balance}
                format={(n) => (n < 0 ? '−' : '') + peso(Math.abs(n))}
                style={{ color: selected.balance >= 0 ? t.accent : t.danger, fontSize: 32, fontWeight: '800' }}
              />
              <Text style={{ color: t.textFaint, fontSize: 12 }}>
                {signedPeso(selected.balance - start)} from now · {selected.net >= 0 ? 'saving' : 'losing'} {peso(Math.abs(selected.net))} that month
              </Text>
            </>
          ) : (
            <Text style={{ color: t.textMuted, fontSize: 13 }}>Add your salary and must-pay expenses below to see the forecast.</Text>
          )}
          <View style={styles.horizon}>
            {[3, 6, 12].map((n) => (
              <PressableScale
                key={n}
                onPress={() => {
                  onSetMonths(n);
                  setSelectedKey(null);
                }}
                style={[styles.chip, { borderColor: plan.months === n ? t.accent : t.border, backgroundColor: plan.months === n ? t.accentSoft : 'transparent' }]}
              >
                <Text style={{ color: plan.months === n ? t.accent : t.textMuted, fontSize: 12, fontWeight: '700' }}>{n} months</Text>
              </PressableScale>
            ))}
          </View>
        </>,
        0,
      )}

      {/* Balance growth — 3D columns, one per month. */}
      {plan.lines.length > 0 &&
        card(
          <>
            <View style={styles.cardHeader}>
              <View style={styles.row}>
                <Feather name="trending-up" size={16} color={t.accent} />
                <Text style={[styles.cardTitle, { color: t.text }]}>Balance by month</Text>
              </View>
              <Text style={{ color: t.textFaint, fontSize: 11 }}>tap a month</Text>
            </View>
            <Bars3D
              theme={t}
              bars={rows.map((r) => ({
                key: r.key,
                value: Math.max(0, r.balance),
                color: r.balance >= 0 ? t.income : t.danger,
                topLabel: shortPeso(r.balance),
                label: MONTH_SHORT[r.month.month],
              }))}
              height={140}
              selectedKey={selected?.key ?? null}
              onSelect={(k) => setSelectedKey(k)}
            />
          </>,
          80,
        )}

      {/* The planning table, like the spreadsheet. */}
      {card(
        <>
          <View style={styles.cardHeader}>
            <View style={styles.row}>
              <Feather name="grid" size={16} color={t.accent} />
              <Text style={[styles.cardTitle, { color: t.text }]}>Monthly plan</Text>
            </View>
            <Text style={{ color: t.textFaint, fontSize: 11 }}>tap a cell to change that month</Text>
          </View>

          {importable > 0 && (
            <PressableScale onPress={onImport} style={[styles.importBtn, { borderColor: t.accent, backgroundColor: t.accentSoft }]}>
              <Feather name="download" size={14} color={t.accent} />
              <Text style={{ color: t.accent, fontSize: 12, fontWeight: '700', flex: 1 }}>
                Add {importable} from your income sources & monthly expenses
              </Text>
            </PressableScale>
          )}

          <InnerHorizontalScroll>
            <View>
              <View style={[styles.tRow, { borderBottomColor: t.border, borderBottomWidth: 1 }]}>
                {nameCell('')}
                {rows.map((r) => (
                  <Pressable key={r.key} onPress={() => setSelectedKey(r.key)} style={[styles.cell, { width: CELL_W }]}>
                    <Text style={{ color: r.key === selected?.key ? t.accent : t.textMuted, fontSize: 11, fontWeight: '800' }}>
                      {MONTH_SHORT[r.month.month]} {String(r.month.year).slice(2)}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {sectionRow('INCOME', t.income, 'income')}
              {incomes.map(lineRow)}
              {totalRow('Total income', rows.map((r) => r.income), t.income)}
              {sectionRow('MUST-PAY', t.danger, 'expense')}
              {expenses.map(lineRow)}
              {totalRow('Total expenses', rows.map((r) => r.expense), t.danger)}
              {totalRow('Saved that month', rows.map((r) => r.net), t.amber, t.cardAlt)}
              {totalRow('Balance', rows.map((r) => r.balance), t.accent, t.accentSoft)}
            </View>
          </InnerHorizontalScroll>

          <Text style={{ color: t.textFaint, fontSize: 11 }}>
            Tap a name to edit the line. Cells outlined in amber differ from the usual amount for that month.
          </Text>
          <View style={styles.row}>
            <PressableScale onPress={() => onEditLine({ kind: 'income' })} style={[styles.addBtn, { borderColor: t.income }]}>
              <Feather name="plus" size={14} color={t.income} />
              <Text style={{ color: t.income, fontWeight: '700', fontSize: 12 }}>Income</Text>
            </PressableScale>
            <PressableScale onPress={() => onEditLine({ kind: 'expense' })} style={[styles.addBtn, { borderColor: t.danger }]}>
              <Feather name="plus" size={14} color={t.danger} />
              <Text style={{ color: t.danger, fontWeight: '700', fontSize: 12 }}>Expense</Text>
            </PressableScale>
          </View>
        </>,
        160,
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 18, borderRadius: 18, borderWidth: 1, gap: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  cardTitle: { fontWeight: '600', fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  startRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8 },
  horizon: { flexDirection: 'row', gap: 8, marginTop: 4 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  tRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'transparent' },
  nameCell: { paddingVertical: 8, paddingRight: 6 },
  cell: { paddingVertical: 8, alignItems: 'flex-end', paddingRight: 8, borderWidth: 1, borderRadius: 6 },
  importBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 12, borderWidth: 1 },
  addBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed' },
});
