export function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * Normalizes free-form time input to 'HH:MM', clamping hour to 0-23 and
 * minute to 0-59. Accepts '8:5', '08:30', '830', '0830', '8'.
 */
export function normalizeTime(input: string): string {
  const clean = input.replace(/[^0-9:]/g, '');
  let h: number;
  let m: number;
  if (clean.includes(':')) {
    const [hStr, mStr] = clean.split(':');
    h = parseInt(hStr, 10) || 0;
    m = parseInt(mStr, 10) || 0;
  } else if (clean.length >= 3) {
    const pivot = clean.length === 3 ? 1 : 2;
    h = parseInt(clean.slice(0, pivot), 10) || 0;
    m = parseInt(clean.slice(pivot, pivot + 2), 10) || 0;
  } else {
    h = parseInt(clean, 10) || 0;
    m = 0;
  }
  h = Math.max(0, Math.min(23, h));
  m = Math.max(0, Math.min(59, m));
  return `${pad(h)}:${pad(m)}`;
}

export function parseTime(time: string): { hour: number; minute: number } {
  const [h, m] = time.split(':').map((v) => parseInt(v, 10));
  return { hour: Number.isNaN(h) ? 0 : h, minute: Number.isNaN(m) ? 0 : m };
}

/**
 * Shifts 'HH:MM' back by `minutes`. `dayShift` is -1 when the result falls on
 * the previous day (e.g. 00:10 minus 30 min → 23:40, dayShift -1).
 */
export function subtractMinutes(
  time: string,
  minutes: number
): { hour: number; minute: number; dayShift: number } {
  const { hour, minute } = parseTime(time);
  let total = hour * 60 + minute - minutes;
  let dayShift = 0;
  while (total < 0) {
    total += 24 * 60;
    dayShift -= 1;
  }
  return { hour: Math.floor(total / 60), minute: total % 60, dayShift };
}
