export type Expense = {
  id: string;
  item: string;
  amount: number;
  category: string;
  timestamp: number;
};

export const CATEGORIES = [
  { name: 'Food & Dining', icon: '🍔' },
  { name: 'Commute / Transport', icon: '🚗' },
  { name: 'Shopping', icon: '🛍️' },
  { name: 'Bills & Utilities', icon: '💡' },
  { name: 'Entertainment', icon: '🎬' },
  { name: 'Other', icon: '📦' },
];

export const categoryIcon = (name: string) =>
  CATEGORIES.find((c) => c.name === name)?.icon ?? '📦';

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
  const headers = ['Time', 'Date', 'Day', 'What did I spend on', 'Category', 'How Much (PHP)'];
  const rows = expenses.map((e) =>
    [
      q(formatTime(e.timestamp)),
      q(formatDate(e.timestamp)),
      q(formatDay(e.timestamp)),
      q(e.item),
      q(e.category),
      e.amount.toFixed(2),
    ].join(','),
  );
  return [headers.join(','), ...rows].join('\n');
};
