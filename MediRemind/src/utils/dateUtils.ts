import {
  format,
  parseISO,
  isToday,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
} from 'date-fns';
import { ko } from 'date-fns/locale';
import { Medicine } from '../types';

// ─── Formatting ──────────────────────────────────────────────────────────────

export function formatDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function formatTodayDisplay(date: Date = new Date()): string {
  return format(date, 'yyyy년 M월 d일 (EEEE)', { locale: ko });
}

export function formatTimeDisplay(time: string): string {
  // '08:00' → '오전 8:00' / '13:00' → '오후 1:00'
  const [h, m] = time.split(':').map(Number);
  const period = h < 12 ? '오전' : '오후';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${period} ${hour12}:${String(m).padStart(2, '0')}`;
}

export function formatMonthDisplay(date: Date): string {
  return format(date, 'yyyy년 M월', { locale: ko });
}

// ─── Scheduling Helpers ──────────────────────────────────────────────────────

/**
 * Returns true if the medicine should be taken on the given ISO date string.
 */
export function isMedicineScheduledForDate(
  medicine: Medicine,
  dateStr: string
): boolean {
  const date = parseISO(dateStr);
  const weekday = getDay(date); // 0=Sun, 1=Mon … 6=Sat
  return isMedicineScheduledForWeekday(medicine, weekday);
}

/**
 * Returns true if the medicine should be taken on the given weekday (0=Sun..6=Sat).
 */
export function isMedicineScheduledForWeekday(
  medicine: Medicine,
  weekday: number
): boolean {
  const { days } = medicine;
  if (days === 'everyday') return true;
  if (days === 'weekday') return weekday >= 1 && weekday <= 5;
  if (days === 'weekend') return weekday === 0 || weekday === 6;
  if (Array.isArray(days)) return days.includes(weekday);
  return false;
}

// ─── Day-of-week helpers ─────────────────────────────────────────────────────

export const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

export function daysLabel(days: Medicine['days']): string {
  if (days === 'everyday') return '매일';
  if (days === 'weekday') return '평일';
  if (days === 'weekend') return '주말';
  if (Array.isArray(days)) {
    if (days.length === 7) return '매일';
    return days.map((d) => DAY_LABELS[d]).join(', ');
  }
  return '';
}

// ─── Calendar helpers ────────────────────────────────────────────────────────

export function getDaysInMonth(
  year: number,
  month: number
): Date[] {
  const start = startOfMonth(new Date(year, month - 1));
  const end = endOfMonth(start);
  return eachDayOfInterval({ start, end });
}

export function getMidnightToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
