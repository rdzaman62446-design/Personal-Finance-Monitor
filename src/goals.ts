import { Month, monthOf, parseMonthKey } from './expenses';

// A savings goal the user puts money towards (e.g. "New phone" ₱25,000).
// Progress is tracked by the amounts the user adds or withdraws on the goal.
export type Goal = {
  id: string;
  name: string;
  icon: string;
  target: number;
  saved: number;
  // Target month "YYYY-MM", or null for no deadline.
  deadline: string | null;
};

const monthIndex = (m: Month) => m.year * 12 + m.month;

// Months left including the current one, or null without a deadline.
export function monthsLeft(goal: Goal, now: number) {
  if (!goal.deadline) return null;
  return monthIndex(parseMonthKey(goal.deadline)) - monthIndex(monthOf(now)) + 1;
}

// How much to put in each month to reach the target by the deadline.
export function perMonthNeeded(goal: Goal, now: number) {
  const left = monthsLeft(goal, now);
  const remaining = Math.max(0, goal.target - goal.saved);
  if (left == null || remaining === 0) return null;
  return left > 0 ? remaining / left : remaining;
}
