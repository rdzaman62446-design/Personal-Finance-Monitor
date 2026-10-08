import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { Expense } from './expenses';

const BACKUP_FORMAT = 'spendtrack-backup';

export type BackupData = { expenses: Expense[]; monthlyBudget: number | null };

// Writes all data to a JSON file and opens the share sheet so it can be saved
// to Google Drive, Files, or sent to yourself.
export async function shareBackup(data: BackupData) {
  const stamp = new Date().toISOString().slice(0, 10);
  const file = new File(Paths.cache, `SpendTrack_Backup_${stamp}.json`);
  file.create({ overwrite: true });
  file.write(JSON.stringify({ format: BACKUP_FORMAT, version: 1, exportedAt: Date.now(), ...data }, null, 2));
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Save SpendTrack backup' });
}

const isExpense = (e: any): e is Expense =>
  e != null &&
  typeof e.id === 'string' &&
  typeof e.item === 'string' &&
  typeof e.amount === 'number' &&
  isFinite(e.amount) &&
  typeof e.category === 'string' &&
  typeof e.timestamp === 'number';

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
  return { expenses, monthlyBudget };
}
