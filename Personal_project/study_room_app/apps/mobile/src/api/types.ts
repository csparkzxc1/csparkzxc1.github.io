// Shape of API responses. Keep in sync with apps/api/src/routes/*.

export interface Guardian {
  id: string;
  name?: string | null;
  phone: string;
  relation?: string | null;
  isPrimary: boolean;
}

export interface Student {
  id: string;
  name: string;
  grade: number | null;
  monthlyFee: number;
  status: string;
  guardians: Guardian[];
  enrollments: Array<{ classRoom: { id: string; name: string } }>;
}

export interface ClassRoom {
  id: string;
  name: string;
  subject: string | null;
  schedules: Array<{
    id: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }>;
  enrollments: Array<{ id: string; studentId: string }>;
}

export type AttendanceStatus = "present" | "absent";
export interface AttendanceRecord {
  id: string;
  studentId: string;
  classRoomId: string | null;
  date: string;
  status: AttendanceStatus;
  checkInAt: string | null;
  checkOutAt: string | null;
  absenceReason: string | null;
  student?: { id: string; name: string };
}

export interface Invoice {
  id: string;
  studentId: string;
  periodYear: number;
  periodMonth: number;
  baseFee: number;
  absenceDeduction: number;
  siblingDiscount: number;
  totalAmount: number;
  status: "issued" | "paid" | "overdue";
  student?: { id: string; name: string };
  lineItems?: Array<{ lineType: string; description: string; amount: number }>;
}

export interface TodayDashboard {
  today: {
    date: string;
    waiting: number;
    checkedIn: number;
    checkedOut: number;
    absent: number;
    activeStudents: number;
  };
  classProgress: Array<{
    id: string;
    name: string;
    startTime: string | null;
    endTime: string | null;
    presentCount: number;
    totalCount: number;
  }>;
  month: {
    year: number;
    month: number;
    expectedRevenue: number;
    unpaidAmount: number;
    unpaidCount: number;
    attendanceRate: number | null;
  };
}
