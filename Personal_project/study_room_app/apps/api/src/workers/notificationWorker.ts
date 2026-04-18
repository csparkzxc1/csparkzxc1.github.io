import { prisma } from "../db";
import { AligoProvider } from "../services/providers/aligo";
import type { AlimtalkProvider } from "../services/providers/types";
import { TEMPLATES, renderTemplate, type AlimtalkTemplateCode } from "../services/templates";

interface WorkerOptions {
  provider?: AlimtalkProvider;
  batchSize?: number;
  intervalMs?: number;
}

/**
 * Polls notification_log for pending entries and dispatches them via the
 * provider. On Alimtalk failure, falls back to SMS (KPI: 99% delivery).
 *
 * The worker is idempotent-ish: rows are moved to status=sent or
 * fallback_sms on success, failed on terminal failure. A crash mid-send
 * leaves the row pending and it's retried on next tick.
 */
export class NotificationWorker {
  private readonly provider: AlimtalkProvider;
  private readonly batchSize: number;
  private readonly intervalMs: number;
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(opts: WorkerOptions = {}) {
    this.provider = opts.provider ?? new AligoProvider();
    this.batchSize = opts.batchSize ?? 20;
    this.intervalMs = opts.intervalMs ?? 3_000;
  }

  start(): void {
    if (this.timer) return;
    const tick = () => {
      if (this.running) return;
      this.running = true;
      this.drain()
        .catch((err) => console.error("notification worker error:", err))
        .finally(() => {
          this.running = false;
        });
    };
    this.timer = setInterval(tick, this.intervalMs);
    tick();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async drain(): Promise<{ processed: number }> {
    const pending = await prisma.notificationLog.findMany({
      where: { status: "pending" },
      orderBy: { createdAt: "asc" },
      take: this.batchSize,
    });

    for (const log of pending) {
      await this.dispatch(log.id);
    }
    return { processed: pending.length };
  }

  private async dispatch(logId: string): Promise<void> {
    const log = await prisma.notificationLog.findUnique({ where: { id: logId } });
    if (!log || log.status !== "pending") return;

    const code = log.templateCode as AlimtalkTemplateCode;
    const template = TEMPLATES[code];
    if (!template) {
      await prisma.notificationLog.update({
        where: { id: logId },
        data: { status: "failed", errorCode: "unknown_template" },
      });
      return;
    }

    const payload = log.payload as Record<string, string>;
    let message: string;
    try {
      message = renderTemplate(code, payload);
    } catch (err) {
      await prisma.notificationLog.update({
        where: { id: logId },
        data: { status: "failed", errorCode: "render_error" },
      });
      return;
    }

    const parentUrl = (payload.parentUrl ?? "") as string;
    const alimtalk = await this.provider.sendAlimtalk({
      phone: log.phone,
      templateId: template.templateId,
      message,
      buttons: parentUrl
        ? [
            {
              name: "출결·수강료 확인",
              type: "WL",
              urlMobile: parentUrl,
              urlPc: parentUrl,
            },
          ]
        : undefined,
    });

    if (alimtalk.success) {
      await prisma.notificationLog.update({
        where: { id: logId },
        data: {
          status: "sent",
          sentAt: new Date(),
          providerMsgId: alimtalk.providerMsgId ?? null,
        },
      });
      return;
    }

    const sms = await this.provider.sendSms({ phone: log.phone, message });
    if (sms.success) {
      await prisma.notificationLog.update({
        where: { id: logId },
        data: {
          status: "fallback_sms",
          sentAt: new Date(),
          providerMsgId: sms.providerMsgId ?? null,
          errorCode: alimtalk.errorCode ?? null,
        },
      });
      return;
    }

    await prisma.notificationLog.update({
      where: { id: logId },
      data: {
        status: "failed",
        errorCode: sms.errorCode ?? alimtalk.errorCode ?? "unknown",
      },
    });
  }
}
