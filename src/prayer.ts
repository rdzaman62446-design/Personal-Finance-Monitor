import { CalculationMethod, CalculationParameters, Coordinates, Madhab, PrayerTimes } from 'adhan';

// Prayer times are calculated on the phone with the `adhan` library (no network);
// only the approximate location comes from a free IP lookup, done once and saved.

export type MethodKey =
  | 'MuslimWorldLeague'
  | 'Karachi'
  | 'Singapore'
  | 'UmmAlQura'
  | 'Egyptian'
  | 'Dubai'
  | 'Kuwait'
  | 'Qatar'
  | 'Turkey'
  | 'NorthAmerica'
  | 'MoonsightingCommittee';

export const METHODS: { key: MethodKey; label: string }[] = [
  { key: 'MuslimWorldLeague', label: 'Muslim World League' },
  { key: 'Karachi', label: 'Karachi (University of Islamic Sciences)' },
  { key: 'Singapore', label: 'Singapore / Malaysia / Philippines' },
  { key: 'UmmAlQura', label: 'Umm al-Qura, Makkah' },
  { key: 'Egyptian', label: 'Egyptian General Authority' },
  { key: 'Dubai', label: 'Dubai' },
  { key: 'Kuwait', label: 'Kuwait' },
  { key: 'Qatar', label: 'Qatar' },
  { key: 'Turkey', label: 'Turkey (Diyanet)' },
  { key: 'NorthAmerica', label: 'ISNA (North America)' },
  { key: 'MoonsightingCommittee', label: 'Moonsighting Committee' },
];

export type PrayerSettings = {
  lat: number;
  lng: number;
  place: string;
  countryCode: string;
  method: MethodKey;
  hanafi: boolean;
};

// Sensible defaults by country; the user can change both in the prayer sheet.
export function defaultsFor(countryCode: string): { method: MethodKey; hanafi: boolean } {
  const cc = countryCode.toUpperCase();
  if (['BD', 'PK', 'IN', 'AF'].includes(cc)) return { method: 'Karachi', hanafi: true };
  if (['PH', 'MY', 'SG', 'ID', 'BN', 'TH'].includes(cc)) return { method: 'Singapore', hanafi: false };
  if (cc === 'SA') return { method: 'UmmAlQura', hanafi: false };
  if (cc === 'AE') return { method: 'Dubai', hanafi: false };
  if (cc === 'KW') return { method: 'Kuwait', hanafi: false };
  if (cc === 'QA') return { method: 'Qatar', hanafi: false };
  if (cc === 'TR') return { method: 'Turkey', hanafi: true };
  if (cc === 'EG') return { method: 'Egyptian', hanafi: false };
  if (['US', 'CA'].includes(cc)) return { method: 'NorthAmerica', hanafi: false };
  return { method: 'MuslimWorldLeague', hanafi: false };
}

// Approximate location from the phone's internet connection (no GPS permission needed).
export async function locateByIp(): Promise<{ lat: number; lng: number; place: string; countryCode: string }> {
  const attempts: [string, (d: any) => { lat: number; lng: number; place: string; countryCode: string } | null][] = [
    [
      'https://ipwho.is/',
      (d) => (d?.success === false || typeof d?.latitude !== 'number' ? null : { lat: d.latitude, lng: d.longitude, place: [d.city, d.country].filter(Boolean).join(', '), countryCode: d.country_code ?? '' }),
    ],
    [
      'https://ipapi.co/json/',
      (d) => (typeof d?.latitude !== 'number' ? null : { lat: d.latitude, lng: d.longitude, place: [d.city, d.country_name].filter(Boolean).join(', '), countryCode: d.country_code ?? '' }),
    ],
  ];
  for (const [url, parse] of attempts) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const loc = parse(await res.json());
      if (loc) return loc;
    } catch {
      // try the next service
    }
  }
  throw new Error('Couldn’t detect your location. Check your internet, or enter it manually.');
}

const params = (s: PrayerSettings): CalculationParameters => {
  const p = (CalculationMethod as unknown as Record<MethodKey, () => CalculationParameters>)[s.method]();
  p.madhab = s.hanafi ? Madhab.Hanafi : Madhab.Shafi;
  return p;
};

export const PRAYER_KEYS = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
export type PrayerKey = (typeof PRAYER_KEYS)[number];
export const PRAYER_LABEL: Record<PrayerKey, string> = {
  fajr: 'Fajr',
  sunrise: 'Sunrise',
  dhuhr: 'Dhuhr',
  asr: 'Asr',
  maghrib: 'Maghrib',
  isha: 'Isha',
};

export function timesFor(s: PrayerSettings, day: Date) {
  const pt = new PrayerTimes(new Coordinates(s.lat, s.lng), day, params(s));
  return PRAYER_KEYS.map((key) => ({ key, label: PRAYER_LABEL[key], time: pt[key].getTime() }));
}

// The prayer whose time it is now and the next one coming up (crossing midnight as needed).
export function prayerNow(s: PrayerSettings, now: number) {
  const today = new Date(now);
  const times = timesFor(s, today);
  const tomorrowFajr = timesFor(s, new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1))[0];
  const passed = times.filter((p) => p.time <= now);
  // Before Fajr it's still Isha from last night.
  const current = passed.length ? passed[passed.length - 1] : { ...times[5], label: 'Isha' };
  const next = times.find((p) => p.time > now) ?? tomorrowFajr;
  return { times, current, next };
}

export function untilText(ms: number) {
  const mins = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export const clock = (ms: number) => new Date(ms).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
