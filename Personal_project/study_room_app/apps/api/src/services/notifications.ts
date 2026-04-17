import { prisma } from "../db";

type TemplateCode = "check_in" | "check_out" | "absence" | "invoice_issued";

/**
 * Queues a notification for delivery via KakaoTalk Alimtalk.
 * MVP implementation persists to notification_log with status=pending;
 * the actual provider integration (aligo/NHN) is wired in apps/api/src/workers.
 */
export async function enqueueNotification(
  templateCode: TemplateCode,
  relatedEntityId: string
) {
  if (templateCode === "check_in" || templateCode === "check_out" || templateCode === "absence") {
    const record = await prisma.attendanceRecord.findUniqueOrThrow({
      where: { id: relatedEntityId },
      include: { student: { include: { guardians: true } } },
    });
    for (const guardian of record.student.guardians) {
      if (!guardian.notificationOptin) continue;
      await prisma.notificationLog.create({
        data: {
          academyId: record.student.academyId,
          guardianId: guardian.id,
          templateCode,
          relatedEntityId: record.id,
          phone: guardian.phone,
          payload: {
            studentName: record.student.name,
            timestamp: record.checkInAt ?? record.checkOutAt ?? record.updatedAt,
            reason: record.absenceReason ?? null,
          },
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
      include: { student: { include: { guardians: { where: { isPrimary: true } } } } },
    });
    for (const guardian of invoice.student.guardians) {
      if (!guardian.notificationOptin) continue;
      await prisma.notificationLog.create({
        data: {
          academyId: invoice.student.academyId,
          guardianId: guardian.id,
          templateCode,
          relatedEntityId: invoice.id,
          phone: guardian.phone,
          payload: {
            studentName: invoice.student.name,
            period: `${invoice.periodYear}-${invoice.periodMonth}`,
            amount: invoice.totalAmount,
          },
          provider: "aligo",
          status: "pending",
        },
      });
    }
  }
}
