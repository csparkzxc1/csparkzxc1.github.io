import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";

export const classesRouter = Router();

const scheduleSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string(),
  endTime: z.string(),
});

const createSchema = z.object({
  academyId: z.string().uuid(),
  name: z.string().min(1).max(50),
  subject: z.string().max(30).optional(),
  schedules: z.array(scheduleSchema).min(1),
});

function parseTime(value: string): Date {
  // Prisma @db.Time expects Date; use fixed epoch day for HH:mm.
  return new Date(`1970-01-01T${value.length === 5 ? value + ":00" : value}Z`);
}

classesRouter.get("/", async (req, res) => {
  const academyId = req.query.academyId as string;
  const classes = await prisma.classRoom.findMany({
    where: { academyId },
    include: { schedules: true, enrollments: { where: { removedAt: null } } },
  });
  res.json({ classes });
});

classesRouter.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ errors: parsed.error.flatten() });

  const { schedules, ...rest } = parsed.data;
  const created = await prisma.classRoom.create({
    data: {
      ...rest,
      schedules: {
        create: schedules.map((s) => ({
          dayOfWeek: s.dayOfWeek,
          startTime: parseTime(s.startTime),
          endTime: parseTime(s.endTime),
        })),
      },
    },
    include: { schedules: true },
  });
  res.status(201).json({ classRoom: created });
});

classesRouter.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const { name, subject, schedules } = req.body as {
    name?: string;
    subject?: string;
    schedules?: Array<{ dayOfWeek: number; startTime: string; endTime: string }>;
  };

  const data: { name?: string; subject?: string | null } = {};
  if (name !== undefined) data.name = name;
  if (subject !== undefined) data.subject = subject || null;

  const updated = await prisma.$transaction(async (tx) => {
    const cls = await tx.classRoom.update({ where: { id }, data });
    if (schedules) {
      await tx.classSchedule.deleteMany({ where: { classRoomId: id } });
      await tx.classSchedule.createMany({
        data: schedules.map((s) => ({
          classRoomId: id,
          dayOfWeek: s.dayOfWeek,
          startTime: parseTime(s.startTime),
          endTime: parseTime(s.endTime),
        })),
      });
    }
    return cls;
  });
  res.json({ classRoom: updated });
});

classesRouter.delete("/:id", async (req, res) => {
  const { id } = req.params;
  const activeEnrollments = await prisma.enrollment.count({
    where: { classRoomId: id, removedAt: null },
  });
  if (activeEnrollments > 0) {
    return res.status(409).json({
      error: "has_students",
      message: `${activeEnrollments}명의 학생이 배정되어 있습니다. 먼저 이동시키세요.`,
    });
  }
  await prisma.classSchedule.deleteMany({ where: { classRoomId: id } });
  await prisma.enrollment.deleteMany({ where: { classRoomId: id } });
  await prisma.classRoom.delete({ where: { id } });
  res.status(204).end();
});

classesRouter.post("/:id/enroll", async (req, res) => {
  const { id } = req.params;
  const { studentId } = req.body as { studentId: string };
  const enrollment = await prisma.enrollment.create({
    data: { classRoomId: id, studentId },
  });
  res.status(201).json({ enrollment });
});
