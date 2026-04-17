import { Router } from "express";
import { prisma } from "../db";

export const dashboardRouter = Router();

/**
 * Aggregates data for the 《오늘》 home screen (WIREFRAMES.md §2).
 * Returns today's attendance counts, per-class progress, and month summary.
 */
dashboardRouter.get("/today", async (req, res) => {
  const academyId = req.query.academyId as string;
  if (!academyId) return res.status(400).json({ error: "academyId required" });

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [records, activeStudents, classRooms, invoices] = await Promise.all([
    prisma.attendanceRecord.findMany({
      where: {
        date: { gte: startOfDay, lt: endOfDay },
        student: { academyId },
      },
      include: { student: true },
    }),
    prisma.student.count({ where: { academyId, status: "active" } }),
    prisma.classRoom.findMany({
      where: { academyId },
      include: {
        enrollments: {
          where: { removedAt: null },
          include: { student: true },
        },
        schedules: true,
      },
    }),
    prisma.invoice.findMany({
      where: {
        periodYear: now.getFullYear(),
        periodMonth: now.getMonth() + 1,
        student: { academyId },
      },
    }),
  ]);

  const dayOfWeek = now.getDay();
  const todaysClassIds = new Set(
    classRooms
      .filter((c) => c.schedules.some((s) => s.dayOfWeek === dayOfWeek))
      .map((c) => c.id)
  );

  const expectedStudentIds = new Set<string>();
  for (const c of classRooms) {
    if (!todaysClassIds.has(c.id)) continue;
    for (const e of c.enrollments) expectedStudentIds.add(e.studentId);
  }

  let checkedIn = 0;
  let checkedOut = 0;
  let absent = 0;
  for (const r of records) {
    if (r.status === "absent") absent += 1;
    else if (r.checkOutAt) checkedOut += 1;
    else if (r.checkInAt) checkedIn += 1;
  }
  const handled = records.map((r) => r.studentId);
  const waiting = [...expectedStudentIds].filter((id) => !handled.includes(id)).length;

  const classProgress = classRooms
    .filter((c) => todaysClassIds.has(c.id))
    .map((c) => {
      const ids = c.enrollments.map((e) => e.studentId);
      const present = records.filter(
        (r) => ids.includes(r.studentId) && r.status === "present"
      ).length;
      const schedule = c.schedules.find((s) => s.dayOfWeek === dayOfWeek);
      return {
        id: c.id,
        name: c.name,
        startTime: schedule?.startTime ?? null,
        endTime: schedule?.endTime ?? null,
        presentCount: present,
        totalCount: ids.length,
      };
    });

  const expectedRevenue = invoices.reduce((sum, i) => sum + i.totalAmount, 0);
  const unpaid = invoices.filter((i) => i.status !== "paid");
  const unpaidAmount = unpaid.reduce((sum, i) => sum + i.totalAmount, 0);

  const totalRecordsThisMonth = await prisma.attendanceRecord.count({
    where: { date: { gte: monthStart, lt: monthEnd }, student: { academyId } },
  });
  const presentRecordsThisMonth = await prisma.attendanceRecord.count({
    where: {
      date: { gte: monthStart, lt: monthEnd },
      status: "present",
      student: { academyId },
    },
  });
  const attendanceRate =
    totalRecordsThisMonth === 0 ? null : presentRecordsThisMonth / totalRecordsThisMonth;

  res.json({
    today: {
      date: startOfDay.toISOString(),
      waiting,
      checkedIn,
      checkedOut,
      absent,
      activeStudents,
    },
    classProgress,
    month: {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      expectedRevenue,
      unpaidAmount,
      unpaidCount: unpaid.length,
      attendanceRate,
    },
  });
});
