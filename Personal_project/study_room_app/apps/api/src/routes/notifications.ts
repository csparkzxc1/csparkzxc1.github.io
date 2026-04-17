import { Router } from "express";
import { prisma } from "../db";

export const notificationsRouter = Router();

notificationsRouter.get("/logs", async (req, res) => {
  const academyId = req.query.academyId as string;
  const status = req.query.status as string | undefined;
  const limit = Math.min(Number(req.query.limit ?? 50), 200);

  const logs = await prisma.notificationLog.findMany({
    where: { academyId, ...(status ? { status } : {}) },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  res.json({ logs });
});

/** KPI endpoint: Alimtalk delivery success rate (MVP.md §9). */
notificationsRouter.get("/stats", async (req, res) => {
  const academyId = req.query.academyId as string;
  const since = req.query.since
    ? new Date(req.query.since as string)
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const grouped = await prisma.notificationLog.groupBy({
    by: ["status"],
    where: { academyId, createdAt: { gte: since } },
    _count: { _all: true },
  });

  const counts = Object.fromEntries(grouped.map((g) => [g.status, g._count._all]));
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const delivered = (counts.sent ?? 0) + (counts.fallback_sms ?? 0);

  res.json({
    since: since.toISOString(),
    total,
    counts,
    successRate: total === 0 ? null : delivered / total,
  });
});
