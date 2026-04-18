import type {
  AttendanceRecord,
  ClassRoom,
  Invoice,
  Student,
  TodayDashboard,
} from "./types";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

export const api = {
  // Onboarding
  setup: (body: {
    academyName: string;
    teacherName: string;
    teacherPhone: string;
  }) =>
    request<{
      academyId: string;
      teacherId: string;
      academyName: string;
      resumed: boolean;
    }>("/api/onboarding/setup", { method: "POST", body: JSON.stringify(body) }),

  // Dashboard
  today: (academyId: string) =>
    request<TodayDashboard>(`/api/dashboard/today?academyId=${academyId}`),

  // Students
  listStudents: (academyId: string) =>
    request<{ students: Student[] }>(`/api/students?academyId=${academyId}`),
  createStudent: (body: {
    academyId: string;
    name: string;
    grade?: number;
    monthlyFee: number;
    enrolledAt: string;
    guardians: Array<{ phone: string; relation?: string; isPrimary?: boolean }>;
  }) =>
    request<{ student: Student }>("/api/students", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // Classes
  listClasses: (academyId: string) =>
    request<{ classes: ClassRoom[] }>(`/api/classes?academyId=${academyId}`),
  createClass: (body: {
    academyId: string;
    name: string;
    subject?: string;
    schedules: Array<{ dayOfWeek: number; startTime: string; endTime: string }>;
  }) =>
    request<{ classRoom: ClassRoom }>("/api/classes", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // Attendance
  listAttendance: (date: string, classRoomId?: string) =>
    request<{ records: AttendanceRecord[] }>(
      `/api/attendance?date=${date}${classRoomId ? `&classRoomId=${classRoomId}` : ""}`
    ),
  checkIn: (body: { studentId: string; classRoomId?: string; recordedBy: string }) =>
    request<{ record: AttendanceRecord }>("/api/attendance/check-in", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  checkOut: (attendanceId: string) =>
    request<{ record: AttendanceRecord }>("/api/attendance/check-out", {
      method: "POST",
      body: JSON.stringify({ attendanceId }),
    }),
  markAbsent: (body: {
    studentId: string;
    date: string;
    recordedBy: string;
    absenceReason: "personal" | "sick" | "no_contact" | "other";
    absenceNote?: string;
  }) =>
    request<{ record: AttendanceRecord }>("/api/attendance/absence", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // Invoices
  listInvoices: (academyId: string, year: number, month: number) =>
    request<{ invoices: Invoice[] }>(
      `/api/invoices?academyId=${academyId}&year=${year}&month=${month}`
    ),
  generateInvoices: (academyId: string, year: number, month: number) =>
    request<{ count: number }>("/api/invoices/generate", {
      method: "POST",
      body: JSON.stringify({ academyId, year, month }),
    }),
  markInvoicePaid: (id: string, paymentMethod: "cash" | "bank_transfer") =>
    request<{ invoice: Invoice }>(`/api/invoices/${id}/mark-paid`, {
      method: "POST",
      body: JSON.stringify({ paymentMethod }),
    }),
};
