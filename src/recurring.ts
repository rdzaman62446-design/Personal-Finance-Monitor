import { daysInMonth, Expense, Month, monthKey, monthOf, parseMonthKey, shiftMonth } from './expenses';

// A bill or subscription that is logged automatically once a month.
export type Recurring = {
  id: string;
  item: string;
  amount: number;
  category: string;
  // Day of the month it is due (1–31; clamped to short months).
  day: number;
  // Last month ("YYYY-MM") an entry was logged for. Months after it are posted when due.
  lastPosted: string;
};

const dueTimestamp = (m: Month, day: number) =>
  new Date(m.year, m.month, Math.min(day, daysInMonth(m)), 9, 0, 0).getTime();

export const recurringEntryId = (ruleId: string, m: Month) => `rec-${ruleId}-${monthKey(m)}`;

export const entryFor = (rule: Recurring, m: Month): Expense => ({
  id: recurringEntryId(rule.id, m),
  item: rule.item,
  amount: rule.amount,
  category: rule.category,
  timestamp: dueTimestamp(m, rule.day),
  kind: 'expense',
  recurringId: rule.id,
});

// Works out which monthly entries are due as of `now` (catching up any months
// the app wasn't opened), and the rules with their `lastPosted` moved forward.
export function collectDue(rules: Recurring[], now: number) {
  const current = monthOf(now);
  const entries: Expense[] = [];
  let changed = false;

  const updated = rules.map((rule) => {
    let m = shiftMonth(parseMonthKey(rule.lastPosted), 1);
    let last = rule.lastPosted;
    // Safety cap: never post more than two years of catch-up at once.
    for (let i = 0; i < 24; i++) {
      const isFuture = m.year > current.year || (m.year === current.year && m.month > current.month);
      if (isFuture || dueTimestamp(m, rule.day) > now) break;
      entries.push(entryFor(rule, m));
      last = monthKey(m);
      m = shiftMonth(m, 1);
    }
    if (last === rule.lastPosted) return rule;
    changed = true;
    return { ...rule, lastPosted: last };
  });

  return { entries, rules: changed ? updated : rules };
}

export const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};
