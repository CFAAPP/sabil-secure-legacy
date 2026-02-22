// Hijri calendar conversion utilities

const HIJRI_MONTHS_FR = [
  'Mouharram', 'Safar', 'Rabiʿ al-Awwal', 'Rabiʿ ath-Thani',
  'Joumada al-Oula', 'Joumada ath-Thania', 'Rajab', 'Chaʿbane',
  'Ramadan', 'Chawwal', 'Dhou al-Qaʿda', 'Dhou al-Hijja',
];

const HIJRI_MONTHS_EN = [
  'Muharram', 'Safar', 'Rabi al-Awwal', 'Rabi al-Thani',
  'Jumada al-Ula', 'Jumada al-Thani', 'Rajab', 'Sha\'ban',
  'Ramadan', 'Shawwal', 'Dhul Qi\'dah', 'Dhul Hijjah',
];

export function getHijriMonths(lang: 'fr' | 'en') {
  return lang === 'fr' ? HIJRI_MONTHS_FR : HIJRI_MONTHS_EN;
}

export interface HijriDate {
  year: number;
  month: number; // 1-12
  day: number;
}

/**
 * Convert Gregorian to Hijri using the Umm al-Qura approximation.
 * This is a simplified but reasonably accurate algorithm.
 */
export function gregorianToHijri(gDate: Date): HijriDate {
  const formatter = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  });
  const parts = formatter.formatToParts(gDate);
  const day = parseInt(parts.find(p => p.type === 'day')?.value || '1');
  const month = parseInt(parts.find(p => p.type === 'month')?.value || '1');
  const year = parseInt(parts.find(p => p.type === 'year')?.value || '1446');
  return { year, month, day };
}

/**
 * Convert Hijri to Gregorian using iterative approach with Intl API.
 */
export function hijriToGregorian(h: HijriDate): Date {
  // Use a reference point and iterate
  // Start from a known date and adjust
  const target = `${h.year}-${String(h.month).padStart(2, '0')}-${String(h.day).padStart(2, '0')}`;
  
  // Binary search for the Gregorian date
  let low = new Date(2000, 0, 1).getTime();
  let high = new Date(2100, 0, 1).getTime();
  
  const formatter = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  });
  
  // Find approximate date first
  const approxYear = Math.round((h.year - 1) * 354.36667 + (h.month - 1) * 29.53056 + h.day + 1948439.5 - 2451545) * 86400000 + new Date(2000, 0, 1).getTime();
  
  // Search around approximate date
  for (let offset = -30; offset <= 30; offset++) {
    const testDate = new Date(approxYear + offset * 86400000);
    const parts = formatter.formatToParts(testDate);
    const td = parseInt(parts.find(p => p.type === 'day')?.value || '0');
    const tm = parseInt(parts.find(p => p.type === 'month')?.value || '0');
    const ty = parseInt(parts.find(p => p.type === 'year')?.value || '0');
    
    if (td === h.day && tm === h.month && ty === h.year) {
      return testDate;
    }
  }
  
  // Fallback: broader search
  const startDate = new Date(Math.round((h.year - 1445) * 354.36667 * 86400000) + new Date(2023, 6, 19).getTime());
  for (let offset = -180; offset <= 180; offset++) {
    const testDate = new Date(startDate.getTime() + offset * 86400000);
    const parts = formatter.formatToParts(testDate);
    const td = parseInt(parts.find(p => p.type === 'day')?.value || '0');
    const tm = parseInt(parts.find(p => p.type === 'month')?.value || '0');
    const ty = parseInt(parts.find(p => p.type === 'year')?.value || '0');
    
    if (td === h.day && tm === h.month && ty === h.year) {
      return testDate;
    }
  }
  
  return new Date(); // fallback
}

/**
 * Get number of days in a Hijri month by checking when the next month starts.
 */
export function daysInHijriMonth(year: number, month: number): number {
  // Find the first day of this month and next month in Gregorian
  const firstDay = hijriToGregorian({ year, month, day: 1 });
  const nextMonth = month === 12 
    ? hijriToGregorian({ year: year + 1, month: 1, day: 1 })
    : hijriToGregorian({ year, month: month + 1, day: 1 });
  
  return Math.round((nextMonth.getTime() - firstDay.getTime()) / 86400000);
}

/**
 * Format a Hijri date as string for storage: "H:YYYY-MM-DD"
 */
export function formatHijriForStorage(h: HijriDate): string {
  return `H:${h.year}-${String(h.month).padStart(2, '0')}-${String(h.day).padStart(2, '0')}`;
}

/**
 * Parse a stored date string. Returns { type, hijri?, gregorian? }
 */
export function parseStoredDate(value: string | null): { type: 'gregorian' | 'hijri'; hijri?: HijriDate; gregorianStr?: string } {
  if (!value) return { type: 'gregorian' };
  if (value.startsWith('H:')) {
    const parts = value.slice(2).split('-').map(Number);
    return { type: 'hijri', hijri: { year: parts[0], month: parts[1], day: parts[2] } };
  }
  return { type: 'gregorian', gregorianStr: value };
}

/**
 * Format Hijri date for display
 */
export function formatHijriDisplay(h: HijriDate, lang: 'fr' | 'en'): string {
  const months = getHijriMonths(lang);
  return `${h.day} ${months[h.month - 1]} ${h.year}`;
}
