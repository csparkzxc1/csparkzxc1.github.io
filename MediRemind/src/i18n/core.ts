/**
 * Framework-agnostic i18n: the active language lives in a module variable so
 * non-React code (notifications, backup) can translate too. React code uses
 * useI18n() so it re-renders when the language changes.
 */
import type { Medicine } from '../types';
import { scheduledWeekdays } from '../lib/schedule';
import { parseTime } from '../lib/time';
import { LOCALES } from './locales';
import { FALLBACK_LANGUAGE, LANGUAGES, LANGUAGE_NAMES, STRINGS, type Language } from './strings';

export type { Language };
export { LANGUAGES, LANGUAGE_NAMES };
export type LanguagePref = Language | 'system';

let activeLanguage: Language = FALLBACK_LANGUAGE;

export function setActiveLanguage(lang: Language): void {
  activeLanguage = lang;
}

export function getActiveLanguage(): Language {
  return activeLanguage;
}

/** Maps a BCP 47 tag ('zh-Hant-TW', 'ja-JP', 'es-419') to a supported language. */
export function matchLanguage(locale: string): Language | null {
  const parts = locale.replace('_', '-').split('-');
  const base = parts[0].toLowerCase();
  if (base === 'zh') {
    const rest = parts.slice(1).map((p) => p.toLowerCase());
    const traditional = rest.includes('hant') || rest.some((p) => ['tw', 'hk', 'mo'].includes(p));
    return traditional ? 'zh-Hant' : 'zh-Hans';
  }
  return (LANGUAGES as readonly string[]).includes(base) ? (base as Language) : null;
}

export function detectDeviceLanguage(): Language {
  try {
    return matchLanguage(Intl.DateTimeFormat().resolvedOptions().locale) ?? FALLBACK_LANGUAGE;
  } catch {
    // Intl unavailable — use the fallback.
    return FALLBACK_LANGUAGE;
  }
}

export function resolvePref(pref: LanguagePref): Language {
  return pref === 'system' ? detectDeviceLanguage() : pref;
}

/** The string for `key`, falling back to English, then to the key itself. */
function lookup(key: string, lang: Language): string {
  const entry = STRINGS[key];
  if (lang === 'ko' || lang === 'en') return entry?.[lang] ?? key;
  return LOCALES[lang]?.[key] ?? entry?.en ?? key;
}

export function t(key: string, params?: Record<string, string | number>): string {
  let str = lookup(key, activeLanguage);
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
  ja: ['日', '月', '火', '水', '木', '金', '土'],
  'zh-Hans': ['日', '一', '二', '三', '四', '五', '六'],
  'zh-Hant': ['日', '一', '二', '三', '四', '五', '六'],
  es: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
  fr: ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'],
};

const WEEKDAYS_LONG: Record<Language, string[]> = {
  ko: ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  ja: ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'],
  'zh-Hans': ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'],
  'zh-Hant': ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'],
  es: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
  fr: ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'],
};

const MONTHS: Partial<Record<Language, string[]>> = {
  en: [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ],
  es: [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ],
  fr: [
    'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
  ],
};

const MONTHS_SHORT_FR = [
  'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
  'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.',
];

/** Morning/afternoon words for the 12-hour clock; other languages use 24 h. */
const MERIDIEM: Partial<Record<Language, [string, string]>> = {
  ko: ['오전', '오후'],
  ja: ['午前', '午後'],
  'zh-Hans': ['上午', '下午'],
  'zh-Hant': ['上午', '下午'],
};

export function weekdayLabels(): string[] {
  return WEEKDAYS[activeLanguage];
}

/** '08:00' → '오전 8:00' / '8:00 AM' / '午前8:00' / '08:00' (es, fr). */
export function formatTime(time: string): string {
  const { hour, minute } = parseTime(time);
  const mm = String(minute).padStart(2, '0');
  if (activeLanguage === 'es' || activeLanguage === 'fr') {
    return `${String(hour).padStart(2, '0')}:${mm}`;
  }
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  const meridiem = MERIDIEM[activeLanguage];
  if (activeLanguage === 'ko') return `${meridiem![hour < 12 ? 0 : 1]} ${hour12}:${mm}`;
  if (meridiem) return `${meridiem[hour < 12 ? 0 : 1]}${hour12}:${mm}`;
  return `${hour12}:${mm} ${hour < 12 ? 'AM' : 'PM'}`;
}

/** Header date, e.g. '7월 6일 월요일' / 'Monday, July 6' / 'lunes, 6 de julio'. */
export function formatLongDate(d: Date): string {
  const wd = WEEKDAYS_LONG[activeLanguage][d.getDay()];
  const m = d.getMonth();
  const day = d.getDate();
  switch (activeLanguage) {
    case 'ko':
      return `${m + 1}월 ${day}일 ${wd}`;
    case 'ja':
    case 'zh-Hans':
    case 'zh-Hant':
      return `${m + 1}月${day}日 ${wd}`;
    case 'es':
      return `${wd}, ${day} de ${MONTHS.es![m]}`;
    case 'fr':
      return `${wd} ${day} ${MONTHS.fr![m]}`;
    default:
      return `${wd}, ${MONTHS.en![m]} ${day}`;
  }
}

export function formatShortDate(key: string): string {
  const [y, m, d] = key.split('-').map((v) => parseInt(v, 10));
  switch (activeLanguage) {
    case 'ko':
      return `${y}년 ${m}월 ${d}일`;
    case 'ja':
    case 'zh-Hans':
    case 'zh-Hant':
      return `${y}年${m}月${d}日`;
    case 'es':
      return `${d} ${MONTHS.es![m - 1].slice(0, 3)} ${y}`;
    case 'fr':
      return `${d} ${MONTHS_SHORT_FR[m - 1]} ${y}`;
    default:
      return `${MONTHS.en![m - 1].slice(0, 3)} ${d}, ${y}`;
  }
}

export function daysLabel(days: Medicine['days']): string {
  if (days === 'everyday') return t('days.everyday');
  if (days === 'weekday') return t('days.weekday');
  if (days === 'weekend') return t('days.weekend');
  const list = scheduledWeekdays(days);
  if (list.length === 7) return t('days.everyday');
  return list.map((d) => WEEKDAYS[activeLanguage][d]).join(', ');
}
