/**
 * Framework-agnostic i18n: the active language lives in a module variable so
 * non-React code (notifications, backup) can translate too. React code uses
 * useI18n() so it re-renders when the language changes.
 */
import type { Medicine } from '../types';
import { scheduledWeekdays } from '../lib/schedule';
import { parseTime } from '../lib/time';
import { FALLBACK_LANGUAGE, LANGUAGES, STRINGS, type Language } from './strings';

export type { Language };
export { LANGUAGES };
export type LanguagePref = Language | 'system';

let activeLanguage: Language = FALLBACK_LANGUAGE;

export function setActiveLanguage(lang: Language): void {
  activeLanguage = lang;
}

export function getActiveLanguage(): Language {
  return activeLanguage;
}

export function detectDeviceLanguage(): Language {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    const tag = locale.toLowerCase().split(/[-_]/)[0];
    if ((LANGUAGES as readonly string[]).includes(tag)) return tag as Language;
  } catch {
    // Intl unavailable — use the fallback.
  }
  return FALLBACK_LANGUAGE;
}

export function resolvePref(pref: LanguagePref): Language {
  return pref === 'system' ? detectDeviceLanguage() : pref;
}

export function t(key: string, params?: Record<string, string | number>): string {
  const entry = STRINGS[key];
  let str = entry ? entry[activeLanguage] ?? entry[FALLBACK_LANGUAGE] : key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }
  return str;
}

// ── Locale-aware formatting ─────────────────────────────────────────────────

const WEEKDAYS: Record<Language, string[]> = {
  ko: ['일', '월', '화', '수', '목', '금', '토'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
};

const WEEKDAYS_LONG: Record<Language, string[]> = {
  ko: ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
};

const MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function weekdayLabels(): string[] {
  return WEEKDAYS[activeLanguage];
}

/** '08:00' → '오전 8:00' / '8:00 AM'. */
export function formatTime(time: string): string {
  const { hour, minute } = parseTime(time);
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  const mm = String(minute).padStart(2, '0');
  if (activeLanguage === 'ko') return `${hour < 12 ? '오전' : '오후'} ${hour12}:${mm}`;
  return `${hour12}:${mm} ${hour < 12 ? 'AM' : 'PM'}`;
}

/** Header date, e.g. '7월 6일 월요일' / 'Monday, July 6'. */
export function formatLongDate(d: Date): string {
  const wd = WEEKDAYS_LONG[activeLanguage][d.getDay()];
  if (activeLanguage === 'ko') return `${d.getMonth() + 1}월 ${d.getDate()}일 ${wd}`;
  return `${wd}, ${MONTHS_EN[d.getMonth()]} ${d.getDate()}`;
}

export function formatShortDate(key: string): string {
  const [y, m, d] = key.split('-').map((v) => parseInt(v, 10));
  if (activeLanguage === 'ko') return `${y}년 ${m}월 ${d}일`;
  return `${MONTHS_EN[m - 1].slice(0, 3)} ${d}, ${y}`;
}

export function daysLabel(days: Medicine['days']): string {
  if (days === 'everyday') return t('days.everyday');
  if (days === 'weekday') return t('days.weekday');
  if (days === 'weekend') return t('days.weekend');
  const list = scheduledWeekdays(days);
  if (list.length === 7) return t('days.everyday');
  return list.map((d) => WEEKDAYS[activeLanguage][d]).join(', ');
}
