import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { CustomCategory, Expense } from './expenses';
import { Plan } from './forecast';
import { Goal } from './goals';
import { IncomeSource } from './incomeSources';
import { Recurring } from './recurring';

const BACKUP_FORMAT = 'spendtrack-backup';

export type BackupData = {
  expenses: Expense[];
  monthlyBudget: number | null;
  categoryBudgets: Record<string, number>;
  recurring: Recurring[];
  incomeSources: IncomeSource[];
  pastSavings: number | null;
  customCategories: CustomCategory[];
  goals: Goal[];
  plan: Plan | null;
};

// Writes all data to a JSON file and opens the share sheet so it can be saved
// to Google Drive, Files, or sent to yourself.
export async function shareBackup(data: BackupData) {
  const stamp = new Date().toISOString().slice(0, 10);
  const file = new File(Paths.cache, `SpendTrack_Backup_${stamp}.json`);
  file.create({ overwrite: true });
  file.write(JSON.stringify({ format: BACKUP_FORMAT, version: 5, exportedAt: Date.now(), ...data }, null, 2));
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Save SpendTrack backup' });
}

const isExpense = (e: any): e is Expense =>
  e != null &&
  typeof e.id === 'string' &&
  typeof e.item === 'string' &&
  typeof e.amount === 'number' &&
  isFinite(e.amount) &&
  typeof e.category === 'string' &&
  typeof e.timestamp === 'number' &&
  (e.kind === undefined || e.kind === 'expense' || e.kind === 'income');

const isRecurring = (r: any): r is Recurring =>
  r != null &&
  typeof r.id === 'string' &&
  typeof r.item === 'string' &&
  typeof r.amount === 'number' &&
  typeof r.category === 'string' &&
  typeof r.day === 'number' &&
  typeof r.lastPosted === 'string' &&
  /^\d{4}-\d{2}$/.test(r.lastPosted);

const isIncomeSource = (s: any): s is IncomeSource =>
  s != null &&
  typeof s.id === 'string' &&
  typeof s.name === 'string' &&
  typeof s.amount === 'number' &&
  typeof s.category === 'string' &&
  (s.frequency === 'monthly' || s.frequency === 'weekly') &&
  typeof s.day === 'number';

const isCustomCategory = (c: any): c is CustomCategory =>
  c != null &&
  typeof c.name === 'string' &&
  typeof c.icon === 'string' &&
  typeof c.color === 'string' &&
  (c.kind === 'expense' || c.kind === 'income');

const isGoal = (g: any): g is Goal =>
  g != null &&
  typeof g.id === 'string' &&
  typeof g.name === 'string' &&
  typeof g.icon === 'string' &&
  typeof g.target === 'number' &&
  typeof g.saved === 'number' &&
  (g.deadline === null || typeof g.deadline === 'string');

// Lets the user pick a backup file. Returns null if they cancel; throws if the
// file is not a valid SpendTrack backup.
export async function pickBackup(): Promise<BackupData | null> {
  const picked = await File.pickFileAsync({ mimeTypes: ['application/json', 'text/plain', '*/*'] });
  if (picked.canceled) return null;
  let parsed: any;
  try {
    parsed = JSON.parse(await picked.result.text());
  } catch {
    throw new Error('That file is not a SpendTrack backup.');
  }
  if (parsed?.format !== BACKUP_FORMAT || !Array.isArray(parsed.expenses)) {
    throw new Error('That file is not a SpendTrack backup.');
  }
  const expenses = parsed.expenses.filter(isExpense);
  const monthlyBudget = typeof parsed.monthlyBudget === 'number' && parsed.monthlyBudget > 0 ? parsed.monthlyBudget : null;
  // Older backups lack the newer fields: v1 has no budgets per category or recurring
  // rules, v2 has no income sources or past savings, v3 has no custom categories or goals, v4 has no forecast plan.
  const categoryBudgets: Record<string, number> = {};
  if (parsed.categoryBudgets && typeof parsed.categoryBudgets === 'object') {
    for (const [name, v] of Object.entries(parsed.categoryBudgets)) {
      if (typeof v === 'number' && v > 0) categoryBudgets[name] = v;
    }
  }
  const recurring = Array.isArray(parsed.recurring) ? parsed.recurring.filter(isRecurring) : [];
  const incomeSources = Array.isArray(parsed.incomeSources) ? parsed.incomeSources.filter(isIncomeSource) : [];
  const pastSavings = typeof parsed.pastSavings === 'number' && parsed.pastSavings > 0 ? parsed.pastSavings : null;
  const customCategories = Array.isArray(parsed.customCategories) ? parsed.customCategories.filter(isCustomCategory) : [];
  const goals = Array.isArray(parsed.goals) ? parsed.goals.filter(isGoal) : [];
  const plan =
    parsed.plan && Array.isArray(parsed.plan.lines) && typeof parsed.plan.months === 'number'
      ? { lines: parsed.plan.lines, overrides: parsed.plan.overrides ?? {}, months: parsed.plan.months, start: parsed.plan.start ?? null, seeded: true }
      : null;
  return { expenses, monthlyBudget, categoryBudgets, recurring, incomeSources, pastSavings, customCategories, goals, plan };
}
