import { daysInMonth, Month, monthKey, shiftMonth } from './expenses';
import { IncomeSource } from './incomeSources';
import { Recurring } from './recurring';

// A planned money line for the Forecast page, like a row in a budget spreadsheet.
export type PlanLine = {
  id: string;
  name: string;
  // Usual amount per month — or per payday when `weekday` is set.
  amount: number;
  kind: 'income' | 'expense';
  // Weekly lines: paid on this weekday (0 = Sunday), so the month total depends on how many there are.
  weekday?: number | null;
  // Where the line came from, so re-importing doesn't duplicate it.
  sourceId?: string;
};

export type Plan = {
  lines: PlanLine[];
  // Per-month amounts that differ from the usual: overrides[monthKey][lineId] = amount.
  overrides: Record<string, Record<string, number>>;
  // How many months to show.
  months: number;
  // Starting balance; null means "use current total savings".
  start: number | null;
  // Set once the user has edited the plan; until then it's pre-filled from the app.
  seeded?: boolean;
};

export const emptyPlan: Plan = { lines: [], overrides: {}, months: 6, start: null };

// How many times a weekday falls in a month (4 or 5).
export function weekdayCount(m: Month, weekday: number) {
  const first = new Date(m.year, m.month, 1).getDay();
  const days = daysInMonth(m);
  let count = 0;
  for (let d = 0; d < days; d++) if ((first + d) % 7 === weekday) count++;
  return count;
}

export const usualAmount = (line: PlanLine, m: Month) =>
  line.weekday != null ? line.amount * weekdayCount(m, line.weekday) : line.amount;

export function lineAmount(plan: Plan, line: PlanLine, m: Month) {
  const override = plan.overrides[monthKey(m)]?.[line.id];
  return override ?? usualAmount(line, m);
}

export const isOverridden = (plan: Plan, line: PlanLine, m: Month) => plan.overrides[monthKey(m)]?.[line.id] != null;

export type ForecastRow = { month: Month; key: string; income: number; expense: number; net: number; balance: number };

// Projects each month from `from`: income − expenses, and the running balance.
export function runForecast(plan: Plan, startBalance: number, from: Month): ForecastRow[] {
  let balance = startBalance;
  return Array.from({ length: plan.months }, (_, i) => {
    const month = shiftMonth(from, i);
    let income = 0;
    let expense = 0;
    for (const line of plan.lines) {
      const v = lineAmount(plan, line, month);
      if (line.kind === 'income') income += v;
      else expense += v;
    }
    const net = income - expense;
    balance += net;
    return { month, key: monthKey(month), income, expense, net, balance };
  });
}

// Lines for income sources and monthly expenses that aren't in the plan yet.
export function linesFromApp(plan: Plan, sources: IncomeSource[], recurring: Recurring[]): PlanLine[] {
  const have = new Set(plan.lines.map((l) => l.sourceId).filter(Boolean));
  const fromSources: PlanLine[] = sources
    .filter((s) => !have.has(`inc:${s.id}`))
    .map((s) => ({
      id: `inc-${s.id}`,
      name: s.name,
      amount: s.amount,
      kind: 'income',
      weekday: s.frequency === 'weekly' ? s.day : null,
      sourceId: `inc:${s.id}`,
    }));
  const fromRecurring: PlanLine[] = recurring
    .filter((r) => !have.has(`rec:${r.id}`))
    .map((r) => ({ id: `rec-${r.id}`, name: r.item, amount: r.amount, kind: 'expense', sourceId: `rec:${r.id}` }));
  return [...fromSources, ...fromRecurring];
}
