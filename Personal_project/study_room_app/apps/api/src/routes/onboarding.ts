import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";

export const onboardingRouter = Router();

const setupSchema = z.object({
  academyName: z.string().min(1).max(100),
  teacherName: z.string().min(1).max(50),
  teacherPhone: z.string().regex(/^010-?\d{4}-?\d{4}$/),
});

/**
 * Single-shot academy + teacher bootstrap for the onboarding flow
 * (WIREFRAMES.md §8). Creates the academy, owner teacher, and default
 * billing rule in one transaction. Idempotent on phone: returns the
 * existing teacher's academy if the phone is already registered.
 */
onboardingRouter.post("/setup", async (req, res) => {
  const parsed = setupSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ errors: parsed.error.flatten() });

  const existing = await prisma.teacher.findUnique({
    where: { phone: parsed.data.teacherPhone },
    include: { academy: true },
  });
  if (existing) {
    return res.json({
      academyId: existing.academyId,
      teacherId: existing.id,
      academyName: existing.academy.name,
      resumed: true,
    });
  }

  const result = await prisma.$transaction(async (tx) => {
    const academy = await tx.academy.create({
      data: { name: parsed.data.academyName },
    });
    const teacher = await tx.teacher.create({
      data: {
        academyId: academy.id,
        phone: parsed.data.teacherPhone,
        name: parsed.data.teacherName,
        role: "owner",
      },
    });
    await tx.academy.update({
      where: { id: academy.id },
      data: { ownerTeacherId: teacher.id },
    });
    await tx.billingRule.create({
      data: {
        academyId: academy.id,
        absenceFreeCount: 2,
        absenceDeductionPerClass: 5000,
        siblingDiscountRate: 0.1,
      },
    });
    return { academy, teacher };
  });

  res.status(201).json({
    academyId: result.academy.id,
    teacherId: result.teacher.id,
    academyName: result.academy.name,
    resumed: false,
  });
});
