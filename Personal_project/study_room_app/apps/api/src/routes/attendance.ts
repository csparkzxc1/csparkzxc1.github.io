import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { enqueueNotification } from "../services/notifications";

export const attendanceRouter = Router();

const checkInSchema = z.object({
  studentId: z.string().uuid(),
  classRoomId: z.string().uuid().optional(),
  recordedBy: z.string().uuid(),
  sendNotification: z.boolean().default(true),
});

const absenceSchema = z.object({
  studentId: z.string().uuid(),
  date: z.string(),
  recordedBy: z.string().uuid(),
  absenceReason: z.enum(["personal", "sick", "no_contact", "other"]),
  absenceNote: z.string().optional(),
  sendNotification: z.boolean().default(true),
});

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

attendanceRouter.get("/", async (req, res) => {
  const date = new Date(req.query.date as string);
  const classRoomId = req.query.classRoomId as string | undefined;
  const records = await prisma.attendanceRecord.findMany({
    where: { date: startOfDay(date), ...(classRoomId ? { classRoomId } : {}) },
    include: { student: true },
  });
  res.json({ records });
});

attendanceRouter.post("/check-in", async (req, res) => {
  const parsed = checkInSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ errors: parsed.error.flatten() });
  const { studentId, classRoomId, recordedBy, sendNotification } = parsed.data;
  const now = new Date();

  const record = await prisma.attendanceRecord.upsert({
    where: { studentId_date: { studentId, date: startOfDay(now) } },
    update: { status: "present", checkInAt: now, classRoomId, recordedBy },
    create: {
      studentId,
      classRoomId,
      date: startOfDay(now),
      status: "present",
      checkInAt: now,
      recordedBy,
    },
  });

  if (sendNotification) await enqueueNotification("check_in", record.id);
  res.status(201).json({ record });
});

attendanceRouter.post("/check-out", async (req, res) => {
  const { attendanceId, sendNotification = true } = req.body as {
    attendanceId: string;
    sendNotification?: boolean;
  };
  const record = await prisma.attendanceRecord.update({
    where: { id: attendanceId },
    data: { checkOutAt: new Date() },
  });
  if (sendNotification) await enqueueNotification("check_out", record.id);
  res.json({ record });
});

attendanceRouter.post("/absence", async (req, res) => {
  const parsed = absenceSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ errors: parsed.error.flatten() });
  const { studentId, date, recordedBy, absenceReason, absenceNote, sendNotification } = parsed.data;

  const record = await prisma.attendanceRecord.upsert({
    where: { studentId_date: { studentId, date: startOfDay(new Date(date)) } },
    update: { status: "absent", absenceReason, absenceNote, recordedBy },
    create: {
      studentId,
      date: startOfDay(new Date(date)),
      status: "absent",
      absenceReason,
      absenceNote,
      recordedBy,
    },
  });

  if (sendNotification) await enqueueNotification("absence", record.id);
  res.status(201).json({ record });
});
