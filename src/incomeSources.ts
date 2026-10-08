import { daysInMonth, Expense, monthOf } from './expenses';
import { ordinal } from './recurring';

// A regular income (a job, allowance, etc.) the user can pick when logging income.
// Nothing is logged automatically: the user confirms each payment when it arrives.
export type IncomeSource = {
  id: string;
  name: string;
  amount: number;
  category: string;
  frequency: 'monthly' | 'weekly';
  // Day of the month (1–31) for monthly, or weekday (0 = Sunday … 6 = Saturday) for weekly.
  day: number;
};

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const scheduleLabel = (s: IncomeSource) =>
  s.frequency === 'monthly' ? `Monthly · ${ordinal(s.day)}` : `Weekly · ${WEEKDAYS[s.day]}`;

// Monthly days past the end of a short month fall on its last day (e.g. the 30th in February).
export function isDueOn(s: IncomeSource, ts: number) {
  const d = new Date(ts);
  if (s.frequency === 'weekly') return d.getDay() === s.day;
  const last = daysInMonth(monthOf(ts));
  return d.getDate() === Math.min(s.day, last);
}

const startOfWeek = (ts: number) => {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay()).getTime();
};

// Whether this source was already logged in the current month (monthly) or week (weekly).
export function loggedThisPeriod(s: IncomeSource, entries: Expense[], now: number) {
  const from =
    s.frequency === 'weekly'
      ? startOfWeek(now)
      : new Date(new Date(now).getFullYear(), new Date(now).getMonth(), 1).getTime();
  return entries.some((e) => e.incomeSourceId === s.id && e.timestamp >= from && e.timestamp <= now + 86400000);
}
