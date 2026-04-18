import { PrismaClient } from "@prisma/client";

/**
 * Realistic demo data for internal demos, screenshots, and beta onboarding
 * rehearsal. Creates an academy with 10 students, 2 classes, 2 weeks of
 * attendance history (~90% attendance rate), and a current-month invoice
 * batch already generated. Safe to re-run — wipes existing demo academy
 * by name prefix before reseeding.
 */

const prisma = new PrismaClient();

const STUDENT_SEEDS = [
  { name: "김민서", grade: 3, fee: 180_000 },
  { name: "박지훈", grade: 3, fee: 180_000 },
  { name: "이수빈", grade: 3, fee: 180_000 },
  { name: "최도윤", grade: 4, fee: 200_000 },
  { name: "정예린", grade: 4, fee: 200_000 },
  { name: "한서준", grade: 5, fee: 220_000 },
  { name: "장하린", grade: 5, fee: 220_000 },
  { name: "오지호", grade: 6, fee: 240_000 },
  { name: "윤지아", grade: 6, fee: 240_000 },
  { name: "서유나", grade: 3, fee: 180_000 },
];

const randomPhone = () =>
  `010-${String(Math.floor(1000 + Math.random() * 9000))}-${String(
    Math.floor(1000 + Math.random() * 9000)
  )}`;

async function main() {
  console.log("wiping prior demo academy...");
  const demoAcademies = await prisma.academy.findMany({
    where: { name: { startsWith: "DEMO_" } },
    select: { id: true },
  });
  const demoIds = demoAcademies.map((a) => a.id);
  if (demoIds.length > 0) {
    await prisma.notificationLog.deleteMany({ where: { academyId: { in: demoIds } } });
    await prisma.academy.deleteMany({ where: { id: { in: demoIds } } });
  }

  console.log("creating demo academy + teacher...");
  const academy = await prisma.academy.create({
    data: { name: `DEMO_민서영어공부방_${new Date().getFullYear()}` },
  });

  const teacher = await prisma.teacher.create({
    data: {
      academyId: academy.id,
      phone: `010-9999-${String(Math.floor(1000 + Math.random() * 9000))}`,
      name: "김선생",
      role: "owner",
    },
  });
  await prisma.academy.update({
    where: { id: academy.id },
    data: { ownerTeacherId: teacher.id },
  });
  await prisma.billingRule.create({
    data: {
      academyId: academy.id,
      absenceFreeCount: 2,
      absenceDeductionPerClass: 5_000,
      siblingDiscountRate: 0.1,
    },
  });

  console.log("creating classes...");
  const lowClass = await prisma.classRoom.create({
    data: {
      academyId: academy.id,
      name: "초3~4 월수금",
      subject: "영어",
      schedules: {
        create: [1, 3, 5].map((day) => ({
          dayOfWeek: day,
          startTime: new Date("1970-01-01T16:00:00Z"),
          endTime: new Date("1970-01-01T17:30:00Z"),
        })),
      },
    },
  });
  const highClass = await prisma.classRoom.create({
    data: {
      academyId: academy.id,
      name: "초5~6 화목",
      subject: "영어",
      schedules: {
        create: [2, 4].map((day) => ({
          dayOfWeek: day,
          startTime: new Date("1970-01-01T17:30:00Z"),
          endTime: new Date("1970-01-01T19:00:00Z"),
        })),
      },
    },
  });

  console.log("creating 10 students...");
  const siblingGroup = crypto.randomUUID();
  const students = [] as Array<{ id: string; grade: number; name: string }>;
  for (let i = 0; i < STUDENT_SEEDS.length; i++) {
    const spec = STUDENT_SEEDS[i];
    const isSibling = i === 5 || i === 6; // 한서준 + 장하린 set as siblings for discount demo
    const student = await prisma.student.create({
      data: {
        academyId: academy.id,
        name: spec.name,
        grade: spec.grade,
        monthlyFee: spec.fee,
        enrolledAt: new Date("2026-03-01"),
        siblingGroupId: isSibling ? siblingGroup : null,
        guardians: {
          create: [{ phone: randomPhone(), isPrimary: true, relation: "mother" }],
        },
      },
    });
    await prisma.enrollment.create({
      data: {
        studentId: student.id,
        classRoomId: spec.grade <= 4 ? lowClass.id : highClass.id,
      },
    });
    students.push({ id: student.id, grade: spec.grade, name: spec.name });
  }

  console.log("generating 2 weeks of attendance (~90%)...");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let daysAgo = 14; daysAgo >= 1; daysAgo--) {
    const date = new Date(today);
    date.setDate(date.getDate() - daysAgo);
    const day = date.getDay();
    for (const s of students) {
      const isLowClassDay = [1, 3, 5].includes(day) && s.grade <= 4;
      const isHighClassDay = [2, 4].includes(day) && s.grade > 4;
      if (!isLowClassDay && !isHighClassDay) continue;

      const roll = Math.random();
      if (roll < 0.9) {
        const checkIn = new Date(date);
        checkIn.setHours(16, Math.floor(Math.random() * 10), 0, 0);
        const checkOut = new Date(checkIn);
        checkOut.setMinutes(checkIn.getMinutes() + 90);
        await prisma.attendanceRecord.create({
          data: {
            studentId: s.id,
            classRoomId: isLowClassDay ? lowClass.id : highClass.id,
            date,
            status: "present",
            checkInAt: checkIn,
            checkOutAt: checkOut,
            recordedBy: teacher.id,
          },
        });
      } else {
        await prisma.attendanceRecord.create({
          data: {
            studentId: s.id,
            date,
            status: "absent",
            absenceReason: roll < 0.95 ? "sick" : "personal",
            recordedBy: teacher.id,
          },
        });
      }
    }
  }

  console.log("generating current-month invoices...");
  const invoicesCreated = students.length;
  for (const s of students) {
    const absenceCount = await prisma.attendanceRecord.count({
      where: {
        studentId: s.id,
        status: "absent",
        date: {
          gte: new Date(today.getFullYear(), today.getMonth(), 1),
        },
      },
    });
    const chargeableAbsences = Math.max(0, absenceCount - 2);
    const absenceDeduction = chargeableAbsences * 5_000;
    const isSibling = s.name === "장하린";
    const baseFee = STUDENT_SEEDS.find((x) => x.name === s.name)!.fee;
    const siblingDiscount = isSibling ? Math.round(baseFee * 0.1) : 0;
    const total = baseFee - absenceDeduction - siblingDiscount;

    await prisma.invoice.create({
      data: {
        studentId: s.id,
        periodYear: today.getFullYear(),
        periodMonth: today.getMonth() + 1,
        baseFee,
        absenceDeduction,
        siblingDiscount,
        totalAmount: total,
        status: Math.random() < 0.5 ? "paid" : "issued",
        issuedAt: new Date(),
        paidAt: Math.random() < 0.5 ? new Date() : null,
      },
    });
  }

  console.log("demo seed complete:");
  console.log("  academyId:", academy.id);
  console.log("  teacher:  ", teacher.name, teacher.phone);
  console.log("  students: ", students.length);
  console.log("  invoices: ", invoicesCreated);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
