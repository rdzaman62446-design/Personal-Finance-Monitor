import {
  categoryIcon,
  daysInMonth,
  Expense,
  formatDate,
  isIncome,
  isInMonth,
  Month,
  monthLabel,
  monthOf,
  peso,
  sameMonth,
  shiftMonth,
  totalIncome,
  totalSpent,
} from './expenses';

// Month-end report numbers, shown in the summary card and shared as text.
export type Summary = ReturnType<typeof summarize>;

export function summarize(expenses: Expense[], month: Month, now: number) {
  const entries = expenses.filter((e) => isInMonth(e.timestamp, month));
  const spending = entries.filter((e) => !isIncome(e));
  const spent = totalSpent(entries);
  const income = totalIncome(entries);
  const prevSpent = totalSpent(expenses.filter((e) => isInMonth(e.timestamp, shiftMonth(month, -1))));
  const isCurrent = sameMonth(month, monthOf(now));
  const days = isCurrent ? new Date(now).getDate() : daysInMonth(month);

  const byCategory: Record<string, number> = {};
  const byDay: Record<number, number> = {};
  for (const e of spending) {
    byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount;
    const d = new Date(e.timestamp).getDate();
    byDay[d] = (byDay[d] ?? 0) + e.amount;
  }
  const top = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, total]) => ({ name, total, share: spent > 0 ? (total / spent) * 100 : 0 }));
  const biggest = spending.reduce<Expense | null>((m, e) => (!m || e.amount > m.amount ? e : m), null);
  const busiest = Object.entries(byDay).sort((a, b) => b[1] - a[1])[0];

  return {
    month,
    isCurrent,
    spent,
    income,
    saved: income - spent,
    rate: income > 0 ? ((income - spent) / income) * 100 : null,
    count: entries.length,
    dailyAvg: spent / days,
    change: prevSpent > 0 ? ((spent - prevSpent) / prevSpent) * 100 : null,
    top,
    biggest,
    busiest: busiest ? { day: +busiest[0], total: busiest[1] } : null,
  };
}

// Plain-text version for sharing to Messenger, Viber, notes, etc.
export function summaryText(s: Summary) {
  const lines = [
    `📊 SpendTrack — ${monthLabel(s.month)}${s.isCurrent ? ' (so far)' : ''}`,
    '',
    `💸 Spent: ${peso(s.spent)}`,
    s.income > 0 ? `💰 Income: ${peso(s.income)}` : null,
    s.income > 0 ? `${s.saved >= 0 ? '🏦 Saved' : '⚠️ Overspent'}: ${peso(Math.abs(s.saved))}${s.rate != null ? ` (${s.rate.toFixed(0)}%)` : ''}` : null,
    `📅 Daily average: ${peso(s.dailyAvg)}`,
    s.change != null ? `${s.change > 0 ? '📈' : '📉'} ${Math.abs(s.change).toFixed(0)}% ${s.change > 0 ? 'more' : 'less'} than last month` : null,
    '',
    s.top.length ? 'Top categories:' : null,
    ...s.top.map((c, i) => `${i + 1}. ${categoryIcon(c.name)} ${c.name} — ${peso(c.total)} (${c.share.toFixed(0)}%)`),
    s.biggest ? `\nBiggest expense: ${s.biggest.item} — ${peso(s.biggest.amount)} (${formatDate(s.biggest.timestamp)})` : null,
  ];
  return lines.filter((l) => l != null).join('\n');
}

