import { categoryIcon, Expense, formatDay, isIncome, monthLabel, monthOf } from './expenses';

// Settings for syncing to the user's Google Sheet through their Apps Script web app.
export type SheetsSync = {
  url: string;
  // Random code that ties the sheet to this phone (the script remembers the first one it sees).
  secret: string;
  lastSync: number | null;
  // Fingerprint of the last data sent, so unchanged data isn't re-sent.
  lastHash: string | null;
  lastError: string | null;
  // Data fingerprint and time of the last failed attempt, to avoid hammering retries offline.
  failedHash?: string | null;
  failedAt?: number | null;
};

export const isScriptUrl = (url: string) => /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec\/?$/.test(url.trim());

export const newSecret = () =>
  Array.from({ length: 3 }, () => Math.random().toString(36).slice(2, 10)).join('');

const pad = (n: number) => String(n).padStart(2, '0');
const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const time = (d: Date) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

// Builds the rows for the Entries, Daily and Monthly tabs (oldest first).
export function buildPayload(expenses: Expense[]) {
  const sorted = [...expenses].sort((a, b) => a.timestamp - b.timestamp);

  const entries = sorted.map((e) => {
    const d = new Date(e.timestamp);
    return {
      id: e.id,
      date: isoDate(d),
      time: time(d),
      day: formatDay(e.timestamp),
      type: isIncome(e) ? 'Income' : 'Expense',
      item: e.item,
      category: `${categoryIcon(e.category)} ${e.category}`,
      amount: e.amount,
      recurring: !!e.recurringId,
    };
  });

  const daily = new Map<string, { date: string; day: string; spent: number; income: number; count: number }>();
  const monthly = new Map<string, { month: string; spent: number; income: number; cats: Record<string, number> }>();
  for (const e of sorted) {
    const d = new Date(e.timestamp);
    const key = isoDate(d);
    const day = daily.get(key) ?? { date: key, day: formatDay(e.timestamp), spent: 0, income: 0, count: 0 };
    const mKey = key.slice(0, 7);
    const month = monthly.get(mKey) ?? { month: monthLabel(monthOf(e.timestamp)), spent: 0, income: 0, cats: {} };
    if (isIncome(e)) {
      day.income += e.amount;
      month.income += e.amount;
    } else {
      day.spent += e.amount;
      month.spent += e.amount;
      month.cats[e.category] = (month.cats[e.category] ?? 0) + e.amount;
    }
    day.count++;
    daily.set(key, day);
    monthly.set(mKey, month);
  }

  return {
    entries,
    daily: [...daily.values()],
    monthly: [...monthly.values()].map((m) => {
      const top = Object.entries(m.cats).sort((a, b) => b[1] - a[1])[0];
      return { month: m.month, spent: m.spent, income: m.income, top: top ? `${categoryIcon(top[0])} ${top[0]}` : '' };
    }),
  };
}

// Whether an automatic sync should run now (manual "Sync now" always runs).
export function shouldAutoSync(sync: SheetsSync, hash: string) {
  if (sync.lastError) return !(hash === sync.failedHash && Date.now() - (sync.failedAt ?? 0) < 60000);
  return hash !== sync.lastHash;
}

// Small, stable fingerprint of the payload to skip syncs when nothing changed.
export function hashPayload(payload: unknown) {
  const s = JSON.stringify(payload);
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return `${s.length}-${(h >>> 0).toString(36)}`;
}

async function post(url: string, body: unknown) {
  // text/plain keeps this a "simple" request that Apps Script accepts without extra setup.
  const res = await fetch(url.trim(), { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) });
  const text = await res.text();
  let data: { ok?: boolean; error?: string; sheet?: string; rows?: number };
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      /<html/i.test(text)
        ? 'Google returned a web page instead of the script. Check the deployment is a Web app with access set to “Anyone”.'
        : `Unexpected reply (HTTP ${res.status}).`,
    );
  }
  if (!data.ok) throw new Error(data.error ?? 'The script reported an error.');
  return data;
}

export const pingSheet = (url: string, secret: string) => post(url, { action: 'ping', secret });

export const pushToSheet = (url: string, secret: string, payload: ReturnType<typeof buildPayload>) =>
  post(url, { action: 'sync', secret, ...payload });

// Checks the script answers, then sends everything. Returns the new sync settings.
export async function connectSheet(url: string, secret: string, expenses: Expense[]): Promise<{ sync: SheetsSync; rows: number }> {
  const cleanUrl = url.trim();
  await pingSheet(cleanUrl, secret);
  const payload = buildPayload(expenses);
  const result = await pushToSheet(cleanUrl, secret, payload);
  return {
    sync: { url: cleanUrl, secret, lastSync: Date.now(), lastHash: hashPayload(payload), lastError: null },
    rows: result.rows ?? payload.entries.length,
  };
}
