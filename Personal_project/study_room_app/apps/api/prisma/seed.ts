import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const academy = await prisma.academy.create({
    data: { name: "민서영어공부방" },
  });

  const teacher = await prisma.teacher.create({
    data: {
      academyId: academy.id,
      phone: "010-1111-2222",
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
      absenceDeductionPerClass: 5000,
      siblingDiscountRate: 0.1,
    },
  });

  const classRoom = await prisma.classRoom.create({
    data: {
      academyId: academy.id,
      name: "초3 월수금",
      subject: "영어",
      schedules: {
        create: [
          { dayOfWeek: 1, startTime: new Date("1970-01-01T16:00:00Z"), endTime: new Date("1970-01-01T17:30:00Z") },
          { dayOfWeek: 3, startTime: new Date("1970-01-01T16:00:00Z"), endTime: new Date("1970-01-01T17:30:00Z") },
          { dayOfWeek: 5, startTime: new Date("1970-01-01T16:00:00Z"), endTime: new Date("1970-01-01T17:30:00Z") },
        ],
      },
    },
  });

  const samples = [
    { name: "김민서", grade: 3, monthlyFee: 180000, phone: "010-1234-5678" },
    { name: "박지훈", grade: 3, monthlyFee: 180000, phone: "010-2345-6789" },
    { name: "이수빈", grade: 3, monthlyFee: 180000, phone: "010-3456-7890" },
  ];

  for (const s of samples) {
    const student = await prisma.student.create({
      data: {
        academyId: academy.id,
        name: s.name,
        grade: s.grade,
        monthlyFee: s.monthlyFee,
        enrolledAt: new Date("2026-03-01"),
        guardians: {
          create: [{ phone: s.phone, relation: "mother", isPrimary: true }],
        },
      },
    });
    await prisma.enrollment.create({
      data: { studentId: student.id, classRoomId: classRoom.id },
    });
  }

  console.log("seed complete:", { academyId: academy.id });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
