import { prisma } from "../db";

/**
 * Calculates and persists invoices for every active student of an academy
 * for the given period. Implements rules from DATA_MODEL.md §3.1.
 */
export async function generateMonthlyInvoices(
  academyId: string,
  year: number,
  month: number
) {
  const rule = await prisma.billingRule.findUnique({ where: { academyId } });
  const absenceFreeCount = rule?.absenceFreeCount ?? 0;
  const absenceDeductionPerClass = rule?.absenceDeductionPerClass ?? 0;
  const siblingDiscountRate = Number(rule?.siblingDiscountRate ?? 0);

  const students = await prisma.student.findMany({
    where: { academyId, status: "active" },
    orderBy: { enrolledAt: "asc" },
  });

  const periodStart = new Date(year, month - 1, 1);
  const periodEnd = new Date(year, month, 1);

  const seenSiblingLead = new Set<string>();
  const results = [];

  for (const student of students) {
    const absences = await prisma.attendanceRecord.count({
      where: {
        studentId: student.id,
        status: "absent",
        date: { gte: periodStart, lt: periodEnd },
      },
    });

    const chargeable = Math.max(0, absences - absenceFreeCount);
    const absenceDeduction = chargeable * absenceDeductionPerClass;

    let siblingDiscount = 0;
    if (student.siblingGroupId) {
      if (seenSiblingLead.has(student.siblingGroupId)) {
        siblingDiscount = Math.round(student.monthlyFee * siblingDiscountRate);
      } else {
        seenSiblingLead.add(student.siblingGroupId);
      }
    }

    const totalAmount = student.monthlyFee - absenceDeduction - siblingDiscount;

    const invoice = await prisma.invoice.upsert({
      where: {
        studentId_periodYear_periodMonth: {
          studentId: student.id,
          periodYear: year,
          periodMonth: month,
        },
      },
      update: {
        baseFee: student.monthlyFee,
        absenceDeduction,
        siblingDiscount,
        totalAmount,
        status: "issued",
        issuedAt: new Date(),
      },
      create: {
        studentId: student.id,
        periodYear: year,
        periodMonth: month,
        baseFee: student.monthlyFee,
        absenceDeduction,
        siblingDiscount,
        totalAmount,
        issuedAt: new Date(),
      },
    });

    await prisma.invoiceLineItem.deleteMany({ where: { invoiceId: invoice.id } });
    await prisma.invoiceLineItem.create({
      data: {
        invoiceId: invoice.id,
        lineType: "base",
        description: "기본 수강료",
        amount: student.monthlyFee,
      },
    });
    if (absenceDeduction > 0) {
      await prisma.invoiceLineItem.create({
        data: {
          invoiceId: invoice.id,
          lineType: "absence_deduction",
          description: `결석 ${chargeable}회 차감`,
          amount: -absenceDeduction,
        },
      });
    }
    if (siblingDiscount > 0) {
      await prisma.invoiceLineItem.create({
        data: {
          invoiceId: invoice.id,
          lineType: "sibling_discount",
          description: "형제 할인",
          amount: -siblingDiscount,
        },
      });
    }

    results.push(invoice);
  }

  return { count: results.length, invoices: results };
}

export async function markPaid(
  invoiceId: string,
  paymentMethod: "cash" | "bank_transfer"
) {
  return prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: "paid", paidAt: new Date(), paymentMethod },
  });
}
