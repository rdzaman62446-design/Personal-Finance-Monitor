// Date ranges for the Table Log period filter. Weeks start on Monday.
export type PeriodKey =
  | 'today'
  | 'yesterday'
  | 'thisWeek'
  | 'lastWeek'
  | 'thisMonth'
  | 'lastMonth'
  | 'last3Months'
  | 'thisYear'
  | 'all';

export const PERIODS: { key: PeriodKey; label: string; icon: string }[] = [
  { key: 'today', label: 'Today', icon: '☀️' },
  { key: 'yesterday', label: 'Yesterday', icon: '🌙' },
  { key: 'thisWeek', label: 'This week', icon: '📅' },
  { key: 'lastWeek', label: 'Last week', icon: '⏮️' },
  { key: 'thisMonth', label: 'This month', icon: '🗓️' },
  { key: 'lastMonth', label: 'Last month', icon: '⏪' },
  { key: 'last3Months', label: 'Last 3 months', icon: '📆' },
  { key: 'thisYear', label: 'This year', icon: '🎯' },
  { key: 'all', label: 'All time', icon: '♾️' },
];

export const periodLabel = (key: PeriodKey) => PERIODS.find((p) => p.key === key)?.label ?? 'All time';

// [start, end) in ms for a period, relative to `now`.
export function periodRange(key: PeriodKey, now: number): [number, number] {
  const d = new Date(now);
  const day = (offset: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + offset).getTime();
  const monday = (d.getDay() + 6) % 7; // days since Monday
  const month = (offset: number) => new Date(d.getFullYear(), d.getMonth() + offset, 1).getTime();
  switch (key) {
    case 'today':
      return [day(0), day(1)];
    case 'yesterday':
      return [day(-1), day(0)];
    case 'thisWeek':
      return [day(-monday), day(-monday + 7)];
    case 'lastWeek':
      return [day(-monday - 7), day(-monday)];
    case 'thisMonth':
      return [month(0), month(1)];
    case 'lastMonth':
      return [month(-1), month(0)];
    case 'last3Months':
      return [month(-2), month(1)];
    case 'thisYear':
      return [new Date(d.getFullYear(), 0, 1).getTime(), new Date(d.getFullYear() + 1, 0, 1).getTime()];
    default:
      return [-Infinity, Infinity];
  }
}

// Short description of the range, e.g. "Oct 6 – Oct 12".
export function periodDates(key: PeriodKey, now: number) {
  if (key === 'all') return 'Everything logged';
  const [a, b] = periodRange(key, now);
  const fmt = (ms: number) => new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const last = b - 1;
  return fmt(a) === fmt(last) ? new Date(a).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) : `${fmt(a)} – ${fmt(last)}`;
}
