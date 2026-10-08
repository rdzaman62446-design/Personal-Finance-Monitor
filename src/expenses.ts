// A logged transaction. Entries saved before income tracking have no `kind`
// and are expenses.
export type Expense = {
  id: string;
  item: string;
  amount: number;
  category: string;
  timestamp: number;
  kind?: 'expense' | 'income';
  // Set on entries created by a recurring rule.
  recurringId?: string;
  // Set on income logged from a saved income source.
  incomeSourceId?: string;
};

export type Kind = 'expense' | 'income';

export type Category = { name: string; icon: string; color: string };

export const CATEGORIES: Category[] = [
  { name: 'Food & Dining', icon: '🍔', color: '#f59e0b' },
  { name: 'Commute / Transport', icon: '🚗', color: '#3b82f6' },
  { name: 'Shopping', icon: '🛍️', color: '#a855f7' },
  { name: 'Bills & Utilities', icon: '💡', color: '#14b8a6' },
  { name: 'Entertainment', icon: '🎬', color: '#f43f5e' },
  { name: 'Other', icon: '📦', color: '#94a3b8' },
];

export const INCOME_CATEGORIES: Category[] = [
  { name: 'Salary', icon: '💼', color: '#10b981' },
  { name: 'Freelance / Side Job', icon: '💻', color: '#22c55e' },
  { name: 'Gift / Allowance', icon: '🎁', color: '#84cc16' },
  { name: 'Other Income', icon: '💰', color: '#4ade80' },
];

const ALL_CATEGORIES = [...CATEGORIES, ...INCOME_CATEGORIES];

export const categoriesFor = (kind: Kind) => (kind === 'income' ? INCOME_CATEGORIES : CATEGORIES);

export const categoryIcon = (name: string) => ALL_CATEGORIES.find((c) => c.name === name)?.icon ?? '📦';

export const categoryColor = (name: string) => ALL_CATEGORIES.find((c) => c.name === name)?.color ?? '#94a3b8';

export const isIncome = (e: Expense) => e.kind === 'income';

export const totalSpent = (list: Expense[]) => list.reduce((s, e) => (isIncome(e) ? s : s + e.amount), 0);

export const totalIncome = (list: Expense[]) => list.reduce((s, e) => (isIncome(e) ? s + e.amount : s), 0);

// Display parts are derived from the timestamp, so "today" compares the full
// calendar date (year included) rather than a "MMM DD" string.
export const formatTime = (ts: number) =>
  new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

export const formatDate = (ts: number) =>
  new Date(ts).toLocaleDateString('en-US', { month: 'short', day: '2-digit' });

export const formatDay = (ts: number) =>
  new Date(ts).toLocaleDateString('en-US', { weekday: 'long' });

export const isSameDay = (a: number, b: number) =>
  new Date(a).toDateString() === new Date(b).toDateString();

export const peso = (n: number) =>
  '₱' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Accepts only positive numbers; returns null for anything else.
export const parseAmount = (text: string): number | null => {
  const n = parseFloat(text);
  if (!isFinite(n) || n <= 0) return null;
  return Math.round(n * 100) / 100;
};

export const toCSV = (expenses: Expense[]) => {
  const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const headers = ['Time', 'Date', 'Day', 'Type', 'Description', 'Category', 'How Much (PHP)'];
  const rows = expenses.map((e) =>
    [
      q(formatTime(e.timestamp)),
      q(formatDate(e.timestamp)),
      q(formatDay(e.timestamp)),
      isIncome(e) ? 'Income' : 'Expense',
      q(e.item),
      q(e.category),
      e.amount.toFixed(2),
    ].join(','),
  );
  return [headers.join(','), ...rows].join('\n');
};

// Months are identified by year and month index, e.g. { year: 2026, month: 9 } for Oct 2026.
export type Month = { year: number; month: number };

export const monthOf = (ts: number): Month => {
  const d = new Date(ts);
  return { year: d.getFullYear(), month: d.getMonth() };
};

export const shiftMonth = ({ year, month }: Month, delta: number): Month => {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
};

export const isInMonth = (ts: number, m: Month) => {
  const d = new Date(ts);
  return d.getFullYear() === m.year && d.getMonth() === m.month;
};

export const sameMonth = (a: Month, b: Month) => a.year === b.year && a.month === b.month;

export const monthLabel = ({ year, month }: Month) =>
  new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

export const daysInMonth = ({ year, month }: Month) => new Date(year, month + 1, 0).getDate();

export const monthKey = ({ year, month }: Month) => `${year}-${String(month + 1).padStart(2, '0')}`;

export const parseMonthKey = (key: string): Month => {
  const [y, m] = key.split('-').map((n) => parseInt(n, 10));
  return { year: y, month: m - 1 };
};
