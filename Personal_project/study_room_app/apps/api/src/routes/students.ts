import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";

export const studentsRouter = Router();

const createSchema = z.object({
  academyId: z.string().uuid(),
  name: z.string().min(1).max(50),
  grade: z.number().int().min(1).max(12).optional(),
  monthlyFee: z.number().int().min(1000).max(2_000_000),
  enrolledAt: z.string(),
  siblingGroupId: z.string().uuid().optional(),
  guardians: z
    .array(
      z.object({
        name: z.string().optional(),
        phone: z.string().regex(/^010-?\d{4}-?\d{4}$/),
        relation: z.enum(["mother", "father", "other"]).optional(),
        isPrimary: z.boolean().default(true),
      })
    )
    .min(1),
});

studentsRouter.get("/", async (req, res) => {
  const academyId = req.query.academyId as string;
  const students = await prisma.student.findMany({
    where: { academyId, status: "active" },
    include: { guardians: true, enrollments: { include: { classRoom: true } } },
  });
  res.json({ students });
});

studentsRouter.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ errors: parsed.error.flatten() });

  const { guardians, ...rest } = parsed.data;
  const student = await prisma.student.create({
    data: {
      ...rest,
      enrolledAt: new Date(rest.enrolledAt),
      guardians: { create: guardians },
    },
    include: { guardians: true },
  });
  res.status(201).json({ student });
});

studentsRouter.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const student = await prisma.student.update({
    where: { id },
    data: req.body,
  });
  res.json({ student });
});

studentsRouter.delete("/:id", async (req, res) => {
  const { id } = req.params;
  await prisma.student.update({
    where: { id },
    data: { status: "withdrawn", withdrawnAt: new Date() },
  });
  res.status(204).end();
});
