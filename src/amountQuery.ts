import { peso } from './expenses';

// Recognises amount searches typed into the Table Log search box:
//   ">500", "over 500", "more than 500", "<200", "under 200", "below 200",
//   ">=500", "100-300", "100 to 300", "=150" or "₱150".
// A bare number ("150") isn't treated as an amount search, so it still matches
// descriptions like "7-Eleven 150ml" as text; it also matches that exact amount.
export type AmountQuery = { test: (amount: number) => boolean; label: string };

const num = (s: string) => parseFloat(s.replace(/[,₱\s]/g, '').replace(/php/i, ''));
const N = '(?:₱|php)?\\s*([\\d,]+(?:\\.\\d+)?)';

export function parseAmountQuery(raw: string): AmountQuery | null {
  const q = raw.trim().toLowerCase();
  if (!q) return null;
  let m: RegExpExecArray | null;

  if ((m = new RegExp(`^${N}\\s*(?:-|–|to)\\s*${N}$`).exec(q))) {
    const [lo, hi] = [num(m[1]), num(m[2])].sort((a, b) => a - b);
    return { test: (a) => a >= lo && a <= hi, label: `${peso(lo)} – ${peso(hi)}` };
  }
  if ((m = new RegExp(`^(?:>=|≥|at least|min)\\s*${N}$`).exec(q))) {
    const v = num(m[1]);
    return { test: (a) => a >= v, label: `${peso(v)} or more` };
  }
  if ((m = new RegExp(`^(?:<=|≤|at most|max|up to)\\s*${N}$`).exec(q))) {
    const v = num(m[1]);
    return { test: (a) => a <= v, label: `${peso(v)} or less` };
  }
  if ((m = new RegExp(`^(?:>|over|above|more than|greater than)\\s*${N}$`).exec(q))) {
    const v = num(m[1]);
    return { test: (a) => a > v, label: `over ${peso(v)}` };
  }
  if ((m = new RegExp(`^(?:<|under|below|less than)\\s*${N}$`).exec(q))) {
    const v = num(m[1]);
    return { test: (a) => a < v, label: `under ${peso(v)}` };
  }
  if ((m = new RegExp(`^(?:=|₱|php)\\s*([\\d,]+(?:\\.\\d+)?)$`).exec(q))) {
    const v = num(m[1]);
    return { test: (a) => Math.abs(a - v) < 0.005, label: `exactly ${peso(v)}` };
  }
  return null;
}

// A bare number: matches entries of exactly that amount (in addition to text matches).
export function bareAmount(raw: string): number | null {
  const q = raw.trim();
  return /^[\d,]+(?:\.\d+)?$/.test(q) ? num(q) : null;
}
