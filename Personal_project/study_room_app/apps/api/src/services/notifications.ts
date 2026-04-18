import { prisma } from "../db";
import type { AlimtalkTemplateCode } from "./templates";
import { localizeAbsenceReason } from "./templates";

function parentUrl(token: string): string {
  const base = process.env.PARENT_BASE_URL ?? "http://localhost:4000";
  return `${base}/p/${token}`;
}

function formatTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/**
 * Builds payload variables for a template and persists a pending
 * notification_log row per opted-in guardian. The worker handles actual
 * dispatch to the provider.
 */
export async function enqueueNotification(
  templateCode: AlimtalkTemplateCode,
  relatedEntityId: string
) {
  if (templateCode === "check_in" || templateCode === "check_out" || templateCode === "absence") {
    const record = await prisma.attendanceRecord.findUniqueOrThrow({
      where: { id: relatedEntityId },
      include: { student: { include: { guardians: true, academy: true } } },
    });

    const baseVars: Record<string, string> = {
      academyName: record.student.academy.name,
      studentName: record.student.name,
    };

    if (templateCode === "check_in" && record.checkInAt) {
      baseVars.time = formatTime(record.checkInAt);
    } else if (templateCode === "check_out" && record.checkOutAt) {
      baseVars.time = formatTime(record.checkOutAt);
    } else if (templateCode === "absence") {
      baseVars.date = formatDate(record.date);
      baseVars.reason = localizeAbsenceReason(record.absenceReason);
    }

    for (const guardian of record.student.guardians) {
      if (!guardian.notificationOptin) continue;
      await prisma.notificationLog.create({
        data: {
          academyId: record.student.academyId,
          guardianId: guardian.id,
          templateCode,
          relatedEntityId: record.id,
          phone: guardian.phone,
          payload: { ...baseVars, parentUrl: parentUrl(guardian.accessToken) },
          provider: "aligo",
          status: "pending",
        },
      });
    }
    return;
  }

  if (templateCode === "invoice_issued") {
    const invoice = await prisma.invoice.findUniqueOrThrow({
      where: { id: relatedEntityId },
      include: {
        student: {
          include: { guardians: { where: { isPrimary: true } }, academy: true },
        },
      },
    });

    const dueDate = new Date(invoice.periodYear, invoice.periodMonth - 1, 25);
    const vars: Record<string, string> = {
      academyName: invoice.student.academy.name,
      studentName: invoice.student.name,
      period: `${invoice.periodYear}년 ${invoice.periodMonth}월`,
      amount: invoice.totalAmount.toLocaleString("ko-KR"),
      bankAccount: process.env.INVOICE_BANK_ACCOUNT ?? "원장님께 문의",
      dueDate: formatDate(dueDate),
    };

    for (const guardian of invoice.student.guardians) {
      if (!guardian.notificationOptin) continue;
      await prisma.notificationLog.create({
        data: {
          academyId: invoice.student.academyId,
          guardianId: guardian.id,
          templateCode,
          relatedEntityId: invoice.id,
          phone: guardian.phone,
          payload: { ...vars, parentUrl: parentUrl(guardian.accessToken) },
          provider: "aligo",
          status: "pending",
        },
      });
    }
  }
}
