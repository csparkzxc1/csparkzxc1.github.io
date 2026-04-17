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
  listStudents: (academyId: string) =>
    request<{ students: Array<{ id: string; name: string; monthlyFee: number }> }>(
      `/api/students?academyId=${academyId}`
    ),
  listAttendance: (date: string, classRoomId?: string) =>
    request<{ records: Array<any> }>(
      `/api/attendance?date=${date}${classRoomId ? `&classRoomId=${classRoomId}` : ""}`
    ),
  checkIn: (body: { studentId: string; classRoomId?: string; recordedBy: string }) =>
    request<{ record: any }>("/api/attendance/check-in", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  listInvoices: (academyId: string, year: number, month: number) =>
    request<{ invoices: Array<any> }>(
      `/api/invoices?academyId=${academyId}&year=${year}&month=${month}`
    ),
  generateInvoices: (academyId: string, year: number, month: number) =>
    request<{ count: number }>("/api/invoices/generate", {
      method: "POST",
      body: JSON.stringify({ academyId, year, month }),
    }),
};
