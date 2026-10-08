// Cleans up typed descriptions so logs read consistently, without changing what
// was written: trims and collapses spaces, fixes spacing around punctuation,
// capitalises the first letter of each sentence, and writes "i" as "I".
// Casing elsewhere is kept (so "CFS" or "iPhone" stay as typed).
export function tidyText(raw: string): string {
  let s = raw.replace(/\s+/g, ' ').trim();
  if (!s) return s;

  s = s
    // No space before closing punctuation: "food , drinks" → "food, drinks".
    .replace(/\s+([,.;:!?)\]])/g, '$1')
    // No space just inside opening brackets: "( lunch" → "(lunch".
    .replace(/([([])\s+/g, '$1')
    // Repeated commas/semicolons collapse: "a,, b" → "a, b". (Keep "..." and "!!".)
    .replace(/([,;])\1+/g, '$1')
    // One space after , ; ! ? when a word follows: "food,drinks" → "food, drinks".
    .replace(/([,;!?])(?=[A-Za-z])/g, '$1 ')
    // After a colon only before letters, so times like 10:30 are untouched.
    .replace(/:(?=[A-Za-z])/g, ': ')
    // After a full stop only between words ("shoes.they"), not in decimals, "e.g." or web addresses.
    .replace(/(\b[A-Za-z]{2,})\.(?=[A-Za-z]{2,}\b)(?!(?:com|net|org|ph|io|co|gov|edu)\b)/g, '$1. ')
    // Space before an opening bracket that follows a word: "lunch(team)" → "lunch (team)".
    .replace(/([A-Za-z0-9])\(/g, '$1 (')
    // Standalone "i" and its contractions.
    .replace(/\bi\b(?!\.)/g, 'I')
    .replace(/\bI'(m|ve|ll|d)\b/gi, (_, c: string) => `I'${c.toLowerCase()}`);

  // Capitalise the first letter, and the first letter after . ! ? followed by a space.
  // A leading number ("7-eleven") is left alone; abbreviations like "e.g." don't end a sentence.
  s = s.replace(/^([^A-Za-z0-9]*)([a-z])/, (_, pre: string, ch: string) => pre + ch.toUpperCase());
  s = s.replace(/([.!?]\s+)([a-z])/g, (match: string, pre: string, ch: string, offset: number) =>
    /(?:\b[a-z]\.[a-z]|\betc|\bvs|\bapprox)\.$/i.test(s.slice(0, offset + 1)) ? match : pre + ch.toUpperCase(),
  );

  return s;
}
