export type Theme = {
  bg: string;
  card: string;
  cardAlt: string;
  input: string;
  border: string;
  text: string;
  textMuted: string;
  textFaint: string;
  accent: string;
  accentSoft: string;
  danger: string;
  dangerSoft: string;
  amber: string;
  purple: string;
  income: string;
  incomeSoft: string;
};

export const darkTheme: Theme = {
  bg: '#020617',
  card: '#0f172a',
  cardAlt: '#0b1222',
  input: '#020617',
  border: '#1e293b',
  text: '#f1f5f9',
  textMuted: '#94a3b8',
  textFaint: '#64748b',
  accent: '#10b981',
  accentSoft: 'rgba(16,185,129,0.12)',
  danger: '#fb7185',
  dangerSoft: 'rgba(244,63,94,0.12)',
  amber: '#fbbf24',
  purple: '#c084fc',
  income: '#38bdf8',
  incomeSoft: 'rgba(56,189,248,0.14)',
};

export const lightTheme: Theme = {
  bg: '#f1f5f9',
  card: '#ffffff',
  cardAlt: '#f8fafc',
  input: '#f8fafc',
  border: '#e2e8f0',
  text: '#0f172a',
  textMuted: '#64748b',
  textFaint: '#94a3b8',
  accent: '#059669',
  accentSoft: 'rgba(16,185,129,0.12)',
  danger: '#e11d48',
  dangerSoft: 'rgba(244,63,94,0.10)',
  amber: '#d97706',
  purple: '#9333ea',
  income: '#0284c7',
  incomeSoft: 'rgba(2,132,199,0.10)',
};

// Green under 75% of budget, amber up to 100%, red when over.
export const budgetColor = (t: Theme, ratio: number) =>
  ratio >= 1 ? t.danger : ratio >= 0.75 ? t.amber : t.accent;
