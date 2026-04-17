/**
 * Alimtalk message templates.
 *
 * Each template must be pre-registered with KakaoTalk channel before use.
 * `code` matches notification_log.template_code. Kakao's template system
 * uses #{var} placeholder syntax; keep these strings in sync with the
 * registered template exactly (whitespace included) or sending fails.
 */

export type AlimtalkTemplateCode =
  | "check_in"
  | "check_out"
  | "absence"
  | "invoice_issued";

interface AlimtalkTemplate {
  code: AlimtalkTemplateCode;
  templateId: string;
  body: string;
  buttons?: Array<{ name: string; type: "WL"; urlMobile: string; urlPc: string }>;
  requiredVars: string[];
}

export const TEMPLATES: Record<AlimtalkTemplateCode, AlimtalkTemplate> = {
  check_in: {
    code: "check_in",
    templateId: "STUDY_ROOM_CHECK_IN_V1",
    body: [
      "[#{academyName}]",
      "#{studentName} 학생이 #{time}에 도착했습니다.",
      "",
      "안전하게 수업 시작합니다.",
    ].join("\n"),
    requiredVars: ["academyName", "studentName", "time"],
  },
  check_out: {
    code: "check_out",
    templateId: "STUDY_ROOM_CHECK_OUT_V1",
    body: [
      "[#{academyName}]",
      "#{studentName} 학생이 #{time}에 하원했습니다.",
      "",
      "오늘도 수고 많았습니다.",
    ].join("\n"),
    requiredVars: ["academyName", "studentName", "time"],
  },
  absence: {
    code: "absence",
    templateId: "STUDY_ROOM_ABSENCE_V1",
    body: [
      "[#{academyName}]",
      "#{studentName} 학생이 #{date} 수업에 결석 처리되었습니다.",
      "사유: #{reason}",
      "",
      "문의사항은 원장님께 연락 부탁드립니다.",
    ].join("\n"),
    requiredVars: ["academyName", "studentName", "date", "reason"],
  },
  invoice_issued: {
    code: "invoice_issued",
    templateId: "STUDY_ROOM_INVOICE_V1",
    body: [
      "[#{academyName}] #{period} 수강료 안내",
      "",
      "#{studentName} 학생",
      "청구 금액: #{amount}원",
      "",
      "납부 계좌: #{bankAccount}",
      "납부 기한: #{dueDate}",
    ].join("\n"),
    requiredVars: ["academyName", "studentName", "period", "amount", "bankAccount", "dueDate"],
  },
};

const ABSENCE_REASON_LABELS: Record<string, string> = {
  personal: "개인사정",
  sick: "병결",
  no_contact: "통보없음",
  other: "기타",
};

export function localizeAbsenceReason(reason: string | null | undefined): string {
  if (!reason) return "미기재";
  return ABSENCE_REASON_LABELS[reason] ?? reason;
}

export function renderTemplate(
  code: AlimtalkTemplateCode,
  vars: Record<string, string | number>
): string {
  const template = TEMPLATES[code];
  const missing = template.requiredVars.filter((v) => vars[v] === undefined);
  if (missing.length > 0) {
    throw new Error(`template ${code} missing vars: ${missing.join(", ")}`);
  }
  return template.body.replace(/#\{(\w+)\}/g, (_, key) => String(vars[key] ?? ""));
}
