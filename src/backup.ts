import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { Expense } from './expenses';
import { Recurring } from './recurring';

const BACKUP_FORMAT = 'spendtrack-backup';

export type BackupData = {
  expenses: Expense[];
  monthlyBudget: number | null;
  categoryBudgets: Record<string, number>;
  recurring: Recurring[];
};

// Writes all data to a JSON file and opens the share sheet so it can be saved
// to Google Drive, Files, or sent to yourself.
export async function shareBackup(data: BackupData) {
  const stamp = new Date().toISOString().slice(0, 10);
  const file = new File(Paths.cache, `SpendTrack_Backup_${stamp}.json`);
  file.create({ overwrite: true });
  file.write(JSON.stringify({ format: BACKUP_FORMAT, version: 2, exportedAt: Date.now(), ...data }, null, 2));
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
  // Version 1 backups have no category budgets or recurring rules.
  const categoryBudgets: Record<string, number> = {};
  if (parsed.categoryBudgets && typeof parsed.categoryBudgets === 'object') {
    for (const [name, v] of Object.entries(parsed.categoryBudgets)) {
      if (typeof v === 'number' && v > 0) categoryBudgets[name] = v;
    }
  }
  const recurring = Array.isArray(parsed.recurring) ? parsed.recurring.filter(isRecurring) : [];
  return { expenses, monthlyBudget, categoryBudgets, recurring };
}
