import type { AlimtalkProvider, AlimtalkRequest, SendResult, SmsRequest } from "./types";

/**
 * Aligo Alimtalk provider.
 *
 * Endpoints referenced:
 *   - POST /akv10/alimtalk/send/      (알림톡 발송)
 *   - POST /send/                     (문자 폴백)
 *
 * In the MVP we gate real network calls behind env presence. If API keys
 * are missing, requests return success=true with a synthetic ID so local
 * development can exercise the pipeline end-to-end.
 */
export class AligoProvider implements AlimtalkProvider {
  private readonly apiKey: string | undefined;
  private readonly userId: string | undefined;
  private readonly sender: string | undefined;
  private readonly senderKey: string | undefined;

  constructor(env: NodeJS.ProcessEnv = process.env) {
    this.apiKey = env.ALIGO_API_KEY;
    this.userId = env.ALIGO_USER_ID;
    this.sender = env.ALIGO_SENDER;
    this.senderKey = env.ALIGO_SENDER_KEY;
  }

  private get isConfigured(): boolean {
    return Boolean(this.apiKey && this.userId && this.sender && this.senderKey);
  }

  async sendAlimtalk(req: AlimtalkRequest): Promise<SendResult> {
    if (!this.isConfigured) {
      return { success: true, providerMsgId: `mock-${Date.now()}` };
    }

    const form = new URLSearchParams({
      apikey: this.apiKey!,
      userid: this.userId!,
      senderkey: this.senderKey!,
      tpl_code: req.templateId,
      sender: this.sender!,
      receiver_1: normalizePhone(req.phone),
      subject_1: "공부방 알림",
      message_1: req.message,
    });
    if (req.buttons && req.buttons.length > 0) {
      form.set("button_1", JSON.stringify({ button: req.buttons }));
    }

    try {
      const res = await fetch("https://kakaoapi.aligo.in/akv10/alimtalk/send/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form.toString(),
      });
      const json = (await res.json()) as { code?: number; message?: string; mid?: string | number };
      if (json.code === 0 && json.mid) {
        return { success: true, providerMsgId: String(json.mid) };
      }
      return {
        success: false,
        errorCode: String(json.code ?? "unknown"),
        errorMessage: json.message ?? "unknown",
      };
    } catch (err) {
      return { success: false, errorCode: "network", errorMessage: (err as Error).message };
    }
  }

  async sendSms(req: SmsRequest): Promise<SendResult> {
    if (!this.isConfigured) {
      return { success: true, providerMsgId: `mock-sms-${Date.now()}` };
    }

    const form = new URLSearchParams({
      key: this.apiKey!,
      user_id: this.userId!,
      sender: this.sender!,
      receiver: normalizePhone(req.phone),
      msg: req.message,
      msg_type: req.message.length > 90 ? "LMS" : "SMS",
    });

    try {
      const res = await fetch("https://apis.aligo.in/send/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form.toString(),
      });
      const json = (await res.json()) as { result_code?: string; message?: string; msg_id?: string | number };
      if (json.result_code === "1" && json.msg_id) {
        return { success: true, providerMsgId: String(json.msg_id) };
      }
      return {
        success: false,
        errorCode: String(json.result_code ?? "unknown"),
        errorMessage: json.message ?? "unknown",
      };
    } catch (err) {
      return { success: false, errorCode: "network", errorMessage: (err as Error).message };
    }
  }
}

function normalizePhone(input: string): string {
  return input.replace(/-/g, "");
}
