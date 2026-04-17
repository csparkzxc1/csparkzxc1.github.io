import { Router } from "express";
import { prisma } from "../db";
import { generateMonthlyInvoices, markPaid } from "../services/billing";
import { enqueueNotification } from "../services/notifications";

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
  const { academyId, year, month, sendNotification = true } = req.body as {
    academyId: string;
    year: number;
    month: number;
    sendNotification?: boolean;
  };
  const result = await generateMonthlyInvoices(academyId, year, month);
  if (sendNotification) {
    for (const inv of result.invoices) {
      await enqueueNotification("invoice_issued", inv.id);
    }
  }
  res.status(201).json(result);
});

invoicesRouter.post("/:id/mark-paid", async (req, res) => {
  const { id } = req.params;
  const { paymentMethod } = req.body as { paymentMethod: "cash" | "bank_transfer" };
  const invoice = await markPaid(id, paymentMethod);
  res.json({ invoice });
});
