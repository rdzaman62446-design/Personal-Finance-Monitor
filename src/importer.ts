import { strFromU8, unzipSync } from 'fflate';

import { categoriesFor, Expense } from './expenses';

// Reads expenses from a spreadsheet: an .xlsx file, a .csv file, or a Google
// Sheets share link. The header row is found automatically by its column names.

type Cell = string | number | null;
type Grid = Cell[][];

export type ImportResult = {
  entries: Expense[];
  skipped: number;
  sheetName: string;
};

// ---------- xlsx ----------

const decodeXml = (s: string) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/g, '&');

// Joins all <t> runs inside an element (handles rich text in shared strings).
const textOf = (xml: string) => decodeXml(Array.from(xml.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g), (m) => m[1]).join(''));

const columnIndex = (ref: string) => {
  let n = 0;
  for (const ch of ref.replace(/\d+$/, '')) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
};

export function parseXlsx(bytes: Uint8Array): { name: string; grid: Grid }[] {
  const files = unzipSync(bytes);
  const read = (path: string) => (files[path] ? strFromU8(files[path]) : '');

  const shared = Array.from(read('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g), (m) => textOf(m[1]));

  const rels: Record<string, string> = {};
  for (const m of read('xl/_rels/workbook.xml.rels').matchAll(/<Relationship\b[^>]*>/g)) {
    const id = /Id="([^"]+)"/.exec(m[0])?.[1];
    const target = /Target="([^"]+)"/.exec(m[0])?.[1];
    if (id && target) rels[id] = target.replace(/^\/?xl\//, '').replace(/^\//, '');
  }

  const sheets: { name: string; grid: Grid }[] = [];
  for (const m of read('xl/workbook.xml').matchAll(/<sheet\b[^>]*>/g)) {
    const name = decodeXml(/name="([^"]*)"/.exec(m[0])?.[1] ?? 'Sheet');
    const rid = /r:id="([^"]+)"/.exec(m[0])?.[1];
    const xml = rid && rels[rid] ? read(`xl/${rels[rid]}`) : '';
    const grid: Grid = [];
    for (const row of xml.matchAll(/<row\b[^>]*?(?:\/>|>([\s\S]*?)<\/row>)/g)) {
      const r = parseInt(/r="(\d+)"/.exec(row[0])?.[1] ?? String(grid.length + 1), 10) - 1;
      const cells: Cell[] = [];
      for (const c of (row[1] ?? '').matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const attrs = c[1];
        const body = c[2] ?? '';
        const ref = /r="([A-Z]+\d+)"/.exec(attrs)?.[1];
        const type = /t="([^"]+)"/.exec(attrs)?.[1];
        const v = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1];
        let value: Cell = null;
        if (type === 's' && v != null) value = shared[parseInt(v, 10)] ?? null;
        else if (type === 'inlineStr') value = textOf(body);
        else if (type === 'str' || type === 'e') value = v != null ? decodeXml(v) : null;
        else if (type === 'b') value = v === '1' ? 'TRUE' : 'FALSE';
        else if (v != null) value = parseFloat(v);
        cells[ref ? columnIndex(ref) : cells.length] = value;
      }
      grid[r] = Array.from(cells, (x) => x ?? null);
    }
    sheets.push({ name, grid: Array.from(grid, (x) => x ?? []) });
  }
  return sheets;
}

// ---------- csv ----------

export function parseCsv(text: string): Grid {
  const rows: Grid = [];
  let row: Cell[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += ch;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

// ---------- dates ----------

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

// Spreadsheet serial day number (days since 1899-12-30) → local date parts.
const fromSerial = (serial: number) => {
  const ms = Math.round((serial - 25569) * 86400000);
  const d = new Date(ms);
  // Serials are wall-clock times, so read them back as UTC to avoid a timezone shift.
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds());
};

// Parses date text such as "10/7/2026", "2026-10-07", "Oct 7, 2026", "7 Oct 2026" or "Oct 07".
export function parseDateText(raw: string, fallbackYear: number): Date | null {
  const s = raw.trim().toLowerCase().replace(/,/g, ' ').replace(/\s+/g, ' ');
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/.exec(s);
  if (m) {
    const year = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    // Month first (US style, as Google Sheets uses for the Philippines), unless that's impossible.
    const [mo, d] = +m[1] > 12 ? [+m[2], +m[1]] : [+m[1], +m[2]];
    return new Date(year, mo - 1, d);
  }
  m = /^(?:[a-z]+ )?([a-z]{3})[a-z]* (\d{1,2})(?: (\d{4}))?/.exec(s);
  if (m && MONTHS.includes(m[1])) return new Date(m[3] ? +m[3] : fallbackYear, MONTHS.indexOf(m[1]), +m[2]);
  m = /^(\d{1,2})[ -]([a-z]{3})[a-z]*[ -]?(\d{4})?/.exec(s);
  if (m && MONTHS.includes(m[2])) return new Date(m[3] ? +m[3] : fallbackYear, MONTHS.indexOf(m[2]), +m[1]);
  return null;
}

// Parses time text such as "10:31 AM", "10:31:45 pm" or "18:14". Returns [hours, minutes].
export function parseTimeText(raw: string): [number, number] | null {
  const m = /(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?\s*([ap])?\.?m?\.?/i.exec(raw.trim());
  if (!m) return null;
  let h = +m[1];
  const ap = m[3]?.toLowerCase();
  if (ap === 'p' && h < 12) h += 12;
  if (ap === 'a' && h === 12) h = 0;
  return h < 24 && +m[2] < 60 ? [h, +m[2]] : null;
}

// ---------- categories ----------

const KEYWORDS: [string, RegExp][] = [
  ['Commute / Transport', /commute|going to|goint to|grab|taxi|jeep|bus|train|mrt|lrt|fare|gas|fuel|parking|angkas|joyride|tricycle|uber/],
  ['Food & Dining', /food|burger|fries|coke|soda|noodle|ramen|bbq|chocolate|coffee|tea|lunch|dinner|breakfast|snack|meal|rice|chicken|pizza|jollibee|mcdo|kfc|restaurant|cafe|milk|bread|drink|water/],
  ['Bills & Utilities', /bill|electric|meralco|water bill|internet|wifi|load|rent|subscription|\bsub\b|credit|plan|claude|chatgpt|netflix|spotify|youtube|icloud|google one/],
  ['Shopping', /shop|lazada|shopee|clothes|shirt|shoes|mall|grocery|groceries|supermarket/],
  ['Entertainment', /movie|cinema|game|steam|concert|bar|party|karaoke/],
];

export const guessCategory = (item: string) => {
  const s = item.toLowerCase();
  return KEYWORDS.find(([, re]) => re.test(s))?.[0] ?? 'Other';
};

const matchCategory = (raw: string, item: string, income: boolean) => {
  const s = raw.trim().toLowerCase();
  const list = categoriesFor(income ? 'income' : 'expense');
  if (s) {
    const hit = list.find((c) => c.name.toLowerCase() === s || c.name.toLowerCase().split(/[ /&]+/).includes(s));
    if (hit) return hit.name;
  }
  return income ? 'Other Income' : guessCategory(item);
};

// ---------- grid → entries ----------

const norm = (c: Cell) => (typeof c === 'string' ? c.trim().toLowerCase() : '');

const findColumn = (header: string[], patterns: RegExp[]) => {
  for (const re of patterns) {
    const i = header.findIndex((h) => re.test(h));
    if (i >= 0) return i;
  }
  return -1;
};

const AMOUNT = [/how much/, /^amount/, /amount/, /price/, /cost/, /^php/, /total/];
const ITEM = [/what did/, /^item/, /description/, /details/, /spen[dt] on/, /^name/, /particular/, /note/];

const hashString = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
};

export function gridToEntries(grid: Grid, now = Date.now()): { entries: Expense[]; skipped: number } | null {
  const headerRow = grid.slice(0, 15).findIndex((row) => {
    const h = row.map(norm);
    return findColumn(h, AMOUNT) >= 0 && findColumn(h, ITEM) >= 0;
  });
  if (headerRow < 0) return null;

  const header = grid[headerRow].map(norm);
  const col = {
    amount: findColumn(header, AMOUNT),
    item: findColumn(header, ITEM),
    date: findColumn(header, [/^date/, /date/, /when/]),
    time: findColumn(header, [/^time/, /time/]),
    category: findColumn(header, [/categor/, /^type of/]),
    kind: findColumn(header, [/^type$/, /^kind$/, /income\s*\/\s*expense/, /in\s*\/\s*out/]),
  };

  const fallbackYear = new Date(now).getFullYear();
  const entries: Expense[] = [];
  let skipped = 0;

  for (const row of grid.slice(headerRow + 1)) {
    const item = String(row[col.item] ?? '').trim();
    const amountCell = row[col.amount];
    const rawAmount =
      typeof amountCell === 'number' ? amountCell : parseFloat(String(amountCell ?? '').replace(/[₱,\s]|php/gi, ''));
    if (!item && (amountCell == null || amountCell === '')) continue; // blank row
    if (!item || !isFinite(rawAmount) || rawAmount === 0) {
      skipped++;
      continue;
    }

    // Date: a spreadsheet serial (may already include the time) or text, plus an optional time column.
    let when: Date | null = null;
    const dateCell = col.date >= 0 ? row[col.date] : null;
    if (typeof dateCell === 'number') when = fromSerial(dateCell);
    else if (typeof dateCell === 'string' && dateCell.trim()) when = parseDateText(dateCell, fallbackYear);
    if (col.date >= 0 && !when) {
      skipped++;
      continue;
    }
    when = when ?? new Date(now);
    const timeCell = col.time >= 0 ? row[col.time] : null;
    const hasTimeOfDay = when.getHours() !== 0 || when.getMinutes() !== 0;
    if (!hasTimeOfDay && timeCell != null) {
      if (typeof timeCell === 'number') {
        const t = fromSerial(timeCell);
        when.setHours(t.getHours(), t.getMinutes(), t.getSeconds());
      } else {
        const hm = parseTimeText(String(timeCell));
        if (hm) when.setHours(hm[0], hm[1]);
      }
    }

    const kindText = col.kind >= 0 ? norm(row[col.kind]) : '';
    const income = /^(income|in|earning|salary)/.test(kindText);
    const amount = Math.round(Math.abs(rawAmount) * 100) / 100;
    const category = matchCategory(col.category >= 0 ? String(row[col.category] ?? '') : '', item, income);
    const timestamp = when.getTime();

    entries.push({
      // Stable id, so importing the same sheet twice doesn't create duplicates.
      id: `imp-${timestamp.toString(36)}-${hashString(`${item}|${amount}`)}`,
      item,
      amount,
      category,
      timestamp,
      kind: income ? 'income' : 'expense',
    });
  }

  return { entries, skipped };
}

// Picks the first sheet with a recognisable header row.
export function sheetsToResult(sheets: { name: string; grid: Grid }[]): ImportResult {
  for (const s of sheets) {
    const r = gridToEntries(s.grid);
    if (r && r.entries.length) return { ...r, sheetName: s.name };
  }
  throw new Error(
    'No expense table found. The sheet needs a header row with columns like "Date", "What did I spend on" / "Item" and "How much" / "Amount".',
  );
}

// ---------- sources ----------

export function googleSheetExportUrl(link: string) {
  const id = /\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/.exec(link)?.[1];
  if (!id) throw new Error('That doesn’t look like a Google Sheets link.');
  return `https://docs.google.com/spreadsheets/d/${id}/export?format=xlsx`;
}

export async function importFromGoogleSheet(link: string): Promise<ImportResult> {
  const res = await fetch(googleSheetExportUrl(link.trim()));
  const type = res.headers.get('content-type') ?? '';
  if (!res.ok || type.includes('text/html')) {
    throw new Error('Couldn’t download the sheet. In Google Sheets, set Share → General access to “Anyone with the link”.');
  }
  return sheetsToResult(parseXlsx(new Uint8Array(await res.arrayBuffer())));
}

export function importFromBytes(name: string, bytes: Uint8Array): ImportResult {
  if (/\.csv$/i.test(name) || /\.txt$/i.test(name)) {
    return sheetsToResult([{ name, grid: parseCsv(strFromU8(bytes)) }]);
  }
  try {
    return sheetsToResult(parseXlsx(bytes));
  } catch (err) {
    // Not a zip: maybe a CSV without the extension.
    if (err instanceof Error && err.message.startsWith('No expense table')) throw err;
    return sheetsToResult([{ name, grid: parseCsv(strFromU8(bytes)) }]);
  }
}
