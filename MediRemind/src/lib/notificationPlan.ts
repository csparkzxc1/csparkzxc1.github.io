/**
 * Turns the medicine list into the smallest set of repeating notifications.
 *
 * iOS keeps at most 64 pending local notifications per app, so scheduling one
 * notification per dose per day runs out within weeks. Instead every medicine
 * that rings at the same time on the same weekday shares one notification, and
 * a time that rings with identical contents all 7 days becomes a single DAILY
 * trigger rather than seven WEEKLY ones.
 */
import type { Medicine } from '../types';
import { scheduledWeekdays } from './schedule';
import { pad, subtractMinutes } from './time';

export interface PlannedDose {
  medicineId: string;
  name: string;
  dosage: string;
  /** Dose time 'HH:MM' (before any notification offset). */
  doseTime: string;
  /** Minutes the notification rings before the dose. */
  offset: number;
  /** Days to add to the delivery date to get the dose date (0 or 1). */
  dayShift: number;
}

export interface PlannedNotification {
  /** Stable key, e.g. 'daily|08:00' or 'w2|21:30'. */
  key: string;
  /** null = every day; otherwise expo weekday 1=Sun..7=Sat. */
  weekday: number | null;
  hour: number;
  minute: number;
  doses: PlannedDose[];
}

export const IOS_PENDING_LIMIT = 64;
/** Dose reminders get this many slots, leaving room for refill alerts. */
export const SCHEDULE_BUDGET = IOS_PENDING_LIMIT - 4;

export function buildNotificationPlan(
  medicines: Medicine[],
  budget = SCHEDULE_BUDGET
): PlannedNotification[] {
  // slot "HH:MM" → weekday 0..6 → doses ringing then
  const slots = new Map<string, Map<number, PlannedDose[]>>();

  for (const med of medicines) {
    if (!med.isActive) continue;
    const offset = Math.max(0, med.notificationOffset ?? 0);
    const weekdays = scheduledWeekdays(med.days);
    for (const doseTime of med.times) {
      const at = subtractMinutes(doseTime, offset);
      const slot = `${pad(at.hour)}:${pad(at.minute)}`;
      for (const doseWeekday of weekdays) {
        // A 00:10 dose with a 30-minute offset rings at 23:40 the day before.
        const ringWeekday = (doseWeekday + at.dayShift + 7) % 7;
        const byDay = slots.get(slot) ?? new Map<number, PlannedDose[]>();
        const list = byDay.get(ringWeekday) ?? [];
        list.push({
          medicineId: med.id,
          name: med.name,
          dosage: med.dosage,
          doseTime,
          offset,
          dayShift: -at.dayShift,
        });
        byDay.set(ringWeekday, list);
        slots.set(slot, byDay);
      }
    }
  }

  const merged = mergedPlan(slots);
  return merged.length <= budget ? merged : compactPlan(slots);
}

type Slots = Map<string, Map<number, PlannedDose[]>>;

const doseKey = (d: PlannedDose) => `${d.medicineId}@${d.doseTime}+${d.dayShift}`;

function slotTime(slot: string): { hour: number; minute: number } {
  const [hour, minute] = slot.split(':').map(Number);
  return { hour, minute };
}

/**
 * One notification per slot per day it rings, listing everything due then.
 * A slot that rings with the same doses all week collapses to one DAILY.
 */
function mergedPlan(slots: Slots): PlannedNotification[] {
  const plan: PlannedNotification[] = [];
  for (const slot of [...slots.keys()].sort()) {
    const byDay = slots.get(slot)!;
    const { hour, minute } = slotTime(slot);
    const signatures = [0, 1, 2, 3, 4, 5, 6].map((d) => signature(byDay.get(d)));
    const sameEveryDay = byDay.size === 7 && signatures.every((s) => s === signatures[0]);

    if (sameEveryDay) {
      plan.push({ key: `daily|${slot}`, weekday: null, hour, minute, doses: sortDoses(byDay.get(0)!) });
      continue;
    }
    for (const day of [...byDay.keys()].sort()) {
      plan.push({ key: `w${day + 1}|${slot}`, weekday: day + 1, hour, minute, doses: sortDoses(byDay.get(day)!) });
    }
  }
  return plan;
}

/**
 * Fewer notifications for large regimens: doses due every day of a slot share
 * one DAILY, and only the day-specific extras get WEEKLY notifications. On
 * those days two reminders ring at the same minute, which beats losing one.
 */
function compactPlan(slots: Slots): PlannedNotification[] {
  const plan: PlannedNotification[] = [];
  for (const slot of [...slots.keys()].sort()) {
    const byDay = slots.get(slot)!;
    const { hour, minute } = slotTime(slot);
    const everyDay =
      byDay.size === 7
        ? (byDay.get(0) ?? []).filter((d) =>
            [1, 2, 3, 4, 5, 6].every((day) => byDay.get(day)!.some((x) => doseKey(x) === doseKey(d)))
          )
        : [];
    const common = new Set(everyDay.map(doseKey));
    if (everyDay.length > 0) {
      plan.push({ key: `daily|${slot}`, weekday: null, hour, minute, doses: sortDoses(everyDay) });
    }
    for (const day of [...byDay.keys()].sort()) {
      const extras = byDay.get(day)!.filter((d) => !common.has(doseKey(d)));
      if (extras.length > 0) {
        plan.push({ key: `w${day + 1}|${slot}`, weekday: day + 1, hour, minute, doses: sortDoses(extras) });
      }
    }
  }
  return plan;
}

function sortDoses(doses: PlannedDose[]): PlannedDose[] {
  return [...doses].sort(
    (a, b) => a.doseTime.localeCompare(b.doseTime) || a.name.localeCompare(b.name)
  );
}

function signature(doses: PlannedDose[] | undefined): string {
  return doses ? sortDoses(doses).map(doseKey).join(',') : '';
}
