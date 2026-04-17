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

classesRouter.post("/:id/enroll", async (req, res) => {
  const { id } = req.params;
  const { studentId } = req.body as { studentId: string };
  const enrollment = await prisma.enrollment.create({
    data: { classRoomId: id, studentId },
  });
  res.status(201).json({ enrollment });
});
