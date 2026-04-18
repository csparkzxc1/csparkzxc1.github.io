import { strict as assert } from "node:assert";
import { after, before, test } from "node:test";
import { PrismaClient } from "@prisma/client";
import { generateMonthlyInvoices } from "../src/services/billing";
import { enqueueNotification } from "../src/services/notifications";
import { NotificationWorker } from "../src/workers/notificationWorker";

/**
 * End-to-end smoke test — the "can one 원장 run a day?" validation.
 * Runs against a real Postgres instance pointed to by DATABASE_URL.
 *
 * Walks the golden path from MVP.md §3:
 *   onboarding → class → students → check-in → absence → invoice
 * and asserts the notification worker drains everything.
 *
 * Usage (prerequisite: DATABASE_URL set, migrations applied):
 *   npm run test:smoke --workspace apps/api
 */

const prisma = new PrismaClient();

const uniquePhone = () =>
  "010-" + String(Math.floor(Math.random() * 9000) + 1000) + "-" +
  String(Math.floor(Math.random() * 9000) + 1000);

let academyId = "";
let teacherId = "";
const studentIds: string[] = [];
let classRoomId = "";

before(async () => {
  // Hoist cleanup so test is idempotent even if a prior run failed mid-way.
  // No ON DELETE CASCADE on academy children → delete leaves upward.
  const stale = await prisma.academy.findMany({
    where: { name: { startsWith: "SMOKE_" } },
    select: { id: true },
  });
  if (stale.length === 0) return;
  const ids = stale.map((a) => a.id);

  await prisma.notificationLog.deleteMany({ where: { academyId: { in: ids } } });
  await prisma.invoiceLineItem.deleteMany({
    where: { invoice: { student: { academyId: { in: ids } } } },
  });
  await prisma.invoice.deleteMany({
    where: { student: { academyId: { in: ids } } },
  });
  await prisma.attendanceRecord.deleteMany({
    where: { student: { academyId: { in: ids } } },
  });
  await prisma.enrollment.deleteMany({
    where: { student: { academyId: { in: ids } } },
  });
  await prisma.classSchedule.deleteMany({
    where: { classRoom: { academyId: { in: ids } } },
  });
  await prisma.classRoom.deleteMany({ where: { academyId: { in: ids } } });
  await prisma.guardian.deleteMany({
    where: { student: { academyId: { in: ids } } },
  });
  await prisma.student.deleteMany({ where: { academyId: { in: ids } } });
  await prisma.billingRule.deleteMany({ where: { academyId: { in: ids } } });
  await prisma.academy.updateMany({
    where: { id: { in: ids } },
    data: { ownerTeacherId: null },
  });
  await prisma.teacher.deleteMany({ where: { academyId: { in: ids } } });
  await prisma.academy.deleteMany({ where: { id: { in: ids } } });
});

after(async () => {
  await prisma.$disconnect();
});

test("onboarding creates academy + teacher + billing rule", async () => {
  const academy = await prisma.academy.create({
    data: { name: `SMOKE_${Date.now()}` },
  });
  const teacher = await prisma.teacher.create({
    data: {
      academyId: academy.id,
      phone: uniquePhone(),
      name: "SMOKE_TEACHER",
      role: "owner",
    },
  });
  await prisma.billingRule.create({
    data: {
      academyId: academy.id,
      absenceFreeCount: 2,
      absenceDeductionPerClass: 5000,
      siblingDiscountRate: 0.1,
    },
  });
  academyId = academy.id;
  teacherId = teacher.id;
  assert.ok(academyId);
  assert.ok(teacherId);
});

test("원장 creates a class", async () => {
  const cls = await prisma.classRoom.create({
    data: {
      academyId,
      name: "smoke-class",
      subject: "영어",
      schedules: {
        create: [
          {
            dayOfWeek: new Date().getDay(),
            startTime: new Date("1970-01-01T16:00:00Z"),
            endTime: new Date("1970-01-01T17:30:00Z"),
          },
        ],
      },
    },
  });
  classRoomId = cls.id;
});

test("원장 creates 3 students with guardians", async () => {
  for (let i = 0; i < 3; i++) {
    const s = await prisma.student.create({
      data: {
        academyId,
        name: `smoke-student-${i}`,
        monthlyFee: 180_000,
        enrolledAt: new Date("2026-04-01"),
        guardians: {
          create: [{ phone: uniquePhone(), isPrimary: true, relation: "mother" }],
        },
      },
    });
    await prisma.enrollment.create({
      data: { studentId: s.id, classRoomId },
    });
    studentIds.push(s.id);
  }
  assert.equal(studentIds.length, 3);
});

test("check-in 2 students, mark 1 absent → notifications enqueued", async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < 2; i++) {
    const rec = await prisma.attendanceRecord.create({
      data: {
        studentId: studentIds[i],
        classRoomId,
        date: today,
        status: "present",
        checkInAt: new Date(),
        recordedBy: teacherId,
      },
    });
    await enqueueNotification("check_in", rec.id);
  }

  const absent = await prisma.attendanceRecord.create({
    data: {
      studentId: studentIds[2],
      date: today,
      status: "absent",
      absenceReason: "sick",
      absenceNote: "감기",
      recordedBy: teacherId,
    },
  });
  await enqueueNotification("absence", absent.id);

  const pending = await prisma.notificationLog.count({
    where: { academyId, status: "pending" },
  });
  assert.equal(pending, 3);
});

test("notification worker drains pending logs", async () => {
  const worker = new NotificationWorker({ intervalMs: 1_000 });
  const result = await worker.drain();
  assert.equal(result.processed, 3);

  const remaining = await prisma.notificationLog.count({
    where: { academyId, status: "pending" },
  });
  assert.equal(remaining, 0);

  const sent = await prisma.notificationLog.count({
    where: { academyId, status: "sent" },
  });
  assert.equal(sent, 3);
});

test("generate invoices applies billing rule correctly", async () => {
  const today = new Date();
  const result = await generateMonthlyInvoices(
    academyId,
    today.getFullYear(),
    today.getMonth() + 1
  );
  assert.equal(result.count, 3);

  // With absence_free_count=2 and only 1 absence, no deduction expected.
  for (const inv of result.invoices) {
    assert.equal(inv.baseFee, 180_000);
    assert.equal(inv.absenceDeduction, 0);
    assert.equal(inv.totalAmount, 180_000);
  }
});

test("over-threshold absences trigger deduction on regenerate", async () => {
  const today = new Date();
  // Add 3 more absences on distinct dates to exceed the free allowance of 2.
  for (let d = 1; d <= 3; d++) {
    const absDate = new Date(today.getFullYear(), today.getMonth(), d);
    await prisma.attendanceRecord.create({
      data: {
        studentId: studentIds[0],
        date: absDate,
        status: "absent",
        absenceReason: "personal",
        recordedBy: teacherId,
      },
    });
  }

  const result = await generateMonthlyInvoices(
    academyId,
    today.getFullYear(),
    today.getMonth() + 1
  );

  const withDeduction = result.invoices.find((i) => i.studentId === studentIds[0])!;
  assert.equal(withDeduction.absenceDeduction, 5_000);
  assert.equal(withDeduction.totalAmount, 175_000);
});

test("guardian access token produces unique parent URL per guardian", async () => {
  const guardians = await prisma.guardian.findMany({
    where: { student: { academyId } },
  });
  const tokens = new Set(guardians.map((g) => g.accessToken));
  assert.equal(tokens.size, guardians.length);
  for (const g of guardians) {
    assert.match(
      g.accessToken,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  }
});
