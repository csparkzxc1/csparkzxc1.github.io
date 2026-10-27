// ─── Core Data Models ──────────────────────────────────────────────────────

export interface Medicine {
  id: string;
  name: string;
  dosage: string;
  times: string[]; // e.g. ['08:00', '13:00', '21:00']
  days: 'everyday' | 'weekday' | 'weekend' | number[]; // number[] = [0..6] where 0=Sun
  color: string;
  memo: string;
  isActive: boolean;
  createdAt: string; // ISO string
  prescription: Prescription | null;
  notificationOffset: number; // minutes before dose time to notify (0 = at dose time)
}

export interface Prescription {
  startDate: string; // 'YYYY-MM-DD'
  totalDays: number;
  alertDays: number[]; // e.g. [3, 7]
}

export interface DoseRecord {
  id: string;
  medicineId: string;
  scheduledTime: string; // 'HH:mm'
  takenAt: string | null; // ISO datetime string
  date: string; // 'YYYY-MM-DD'
  isTaken: boolean;
}

// ─── Navigation Param Lists ────────────────────────────────────────────────

export type RootStackParamList = {
  Main: undefined;
  MedicineForm: { medicineId?: string } | undefined;
  Paywall: undefined;
};

export type BottomTabParamList = {
  Home: undefined;
  MedicineList: undefined;
  Calendar: undefined;
  Settings: undefined;
};

// ─── Medicine color tags ────────────────────────────────────────────────────

export type ColorTag = '#4A6CF7' | '#10B981' | '#F59E0B' | '#EF4444' | '#8B5CF6' | '#14B8A6';

export const COLOR_TAGS: ColorTag[] = [
  '#4A6CF7',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#14B8A6',
];
