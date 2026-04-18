import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";

export const settingsRouter = Router();

const ruleSchema = z.object({
  absenceFreeCount: z.number().int().min(0).max(10),
  absenceDeductionPerClass: z.number().int().min(0).max(100_000),
  siblingDiscountRate: z.number().min(0).max(0.5),
});

settingsRouter.get("/billing-rule", async (req, res) => {
  const academyId = req.query.academyId as string;
  const rule = await prisma.billingRule.findUnique({ where: { academyId } });
  res.json({
    rule: rule ?? {
      academyId,
      absenceFreeCount: 0,
      absenceDeductionPerClass: 0,
      siblingDiscountRate: 0,
    },
  });
});

settingsRouter.put("/billing-rule", async (req, res) => {
  const academyId = (req.query.academyId as string) ?? (req.body.academyId as string);
  if (!academyId) return res.status(400).json({ error: "academyId required" });

  const parsed = ruleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ errors: parsed.error.flatten() });

  const rule = await prisma.billingRule.upsert({
    where: { academyId },
    create: { academyId, ...parsed.data },
    update: parsed.data,
  });
  res.json({ rule });
});

settingsRouter.get("/academy", async (req, res) => {
  const academyId = req.query.academyId as string;
  const academy = await prisma.academy.findUnique({ where: { id: academyId } });
  res.json({ academy });
});

settingsRouter.patch("/academy", async (req, res) => {
  const academyId = (req.query.academyId as string) ?? (req.body.academyId as string);
  const name = z.string().min(1).max(100).safeParse(req.body.name);
  if (!name.success) return res.status(400).json({ errors: name.error.flatten() });
  const academy = await prisma.academy.update({
    where: { id: academyId },
    data: { name: name.data },
  });
  res.json({ academy });
});
