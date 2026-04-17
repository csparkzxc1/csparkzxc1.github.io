import { Router } from "express";
import { prisma } from "../db";
import { generateMonthlyInvoices, markPaid } from "../services/billing";

export const invoicesRouter = Router();

invoicesRouter.get("/", async (req, res) => {
  const academyId = req.query.academyId as string;
  const year = Number(req.query.year);
  const month = Number(req.query.month);

  const invoices = await prisma.invoice.findMany({
    where: {
      periodYear: year,
      periodMonth: month,
      student: { academyId },
    },
    include: { student: true, lineItems: true },
  });
  res.json({ invoices });
});

invoicesRouter.post("/generate", async (req, res) => {
  const { academyId, year, month } = req.body as {
    academyId: string;
    year: number;
    month: number;
  };
  const result = await generateMonthlyInvoices(academyId, year, month);
  res.status(201).json(result);
});

invoicesRouter.post("/:id/mark-paid", async (req, res) => {
  const { id } = req.params;
  const { paymentMethod } = req.body as { paymentMethod: "cash" | "bank_transfer" };
  const invoice = await markPaid(id, paymentMethod);
  res.json({ invoice });
});
