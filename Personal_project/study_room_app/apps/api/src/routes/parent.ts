import { Router } from "express";
import { prisma } from "../db";
import { localizeAbsenceReason } from "../services/templates";

export const parentRouter = Router();

/**
 * Public, read-only view for guardians to look up their student's
 * attendance history and current-month invoice. Accessed via a
 * per-guardian access token (MVP.md §4.2: "학부모 앱 → 앱 가벼운 버전").
 * Token is embedded in Alimtalk button URLs.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

parentRouter.get("/:token", async (req, res) => {
  const { token } = req.params;

  if (!UUID_RE.test(token)) {
    res
      .status(404)
      .type("html")
      .send(layout("잘못된 링크", "<p class=\"empty\">링크가 올바르지 않습니다.</p>"));
    return;
  }

  const guardian = await prisma.guardian.findUnique({
    where: { accessToken: token },
    include: {
      student: {
        include: { academy: true },
      },
    },
  });

  if (!guardian) {
    res
      .status(404)
      .type("html")
      .send(layout("잘못된 링크", "<p class=\"empty\">학부모님 링크를 확인할 수 없습니다.</p>"));
    return;
  }

  const { student } = guardian;
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [records, invoice] = await Promise.all([
    prisma.attendanceRecord.findMany({
      where: { studentId: student.id, date: { gte: since } },
      orderBy: { date: "desc" },
      take: 30,
    }),
    prisma.invoice.findFirst({
      where: {
        studentId: student.id,
        periodYear: now.getFullYear(),
        periodMonth: now.getMonth() + 1,
      },
      include: { lineItems: true },
    }),
  ]);

  const presentCount = records.filter((r) => r.status === "present").length;
  const absentCount = records.filter((r) => r.status === "absent").length;

  const historyRows = records
    .map((r) => {
      const date = r.date.toISOString().slice(0, 10);
      if (r.status === "present") {
        const inT = r.checkInAt ? fmtTime(r.checkInAt) : "—";
        const outT = r.checkOutAt ? fmtTime(r.checkOutAt) : "—";
        return `<tr><td>${date}</td><td class="ok">등원</td><td>${inT} ~ ${outT}</td></tr>`;
      }
      const reason = localizeAbsenceReason(r.absenceReason);
      return `<tr><td>${date}</td><td class="absent">결석</td><td>${escape(reason)}</td></tr>`;
    })
    .join("");

  const invoiceBlock = invoice
    ? `
    <section class="card">
      <h2>${now.getFullYear()}년 ${now.getMonth() + 1}월 수강료</h2>
      <div class="amount">${invoice.totalAmount.toLocaleString("ko-KR")}원</div>
      <div class="status status-${invoice.status}">${statusLabel(invoice.status)}</div>
      <ul class="line-items">
        ${invoice.lineItems
          .map(
            (li) =>
              `<li><span>${escape(li.description)}</span><span>${
                li.amount >= 0 ? "+" : ""
              }${li.amount.toLocaleString("ko-KR")}원</span></li>`
          )
          .join("")}
      </ul>
    </section>`
    : "";

  const body = `
    <section class="card header">
      <div class="academy">${escape(student.academy.name)}</div>
      <h1>${escape(student.name)}</h1>
      <div class="summary">
        최근 30일 · 등원 ${presentCount}회 · 결석 ${absentCount}회
      </div>
    </section>

    ${invoiceBlock}

    <section class="card">
      <h2>출결 기록 (최근 30일)</h2>
      ${
        historyRows
          ? `<table><thead><tr><th>날짜</th><th>상태</th><th>비고</th></tr></thead><tbody>${historyRows}</tbody></table>`
          : `<p class="empty">아직 기록이 없습니다.</p>`
      }
    </section>

    <p class="foot">본 페이지는 ${escape(
      student.academy.name
    )} 원장님이 제공합니다. 링크는 외부에 공유하지 마세요.</p>
  `;

  res.type("html").send(layout(`${student.name} · ${student.academy.name}`, body));
});

function fmtTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function statusLabel(status: string): string {
  if (status === "paid") return "수납 완료";
  if (status === "overdue") return "연체";
  return "미수";
}

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return map[c];
  });
}

function layout(title: string, body: string): string {
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex, nofollow" />
  <title>${escape(title)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0; padding: 16px;
      font-family: -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo",
        "Malgun Gothic", system-ui, sans-serif;
      background: #f5f5f7; color: #222;
      max-width: 540px; margin: 0 auto;
    }
    .card {
      background: #fff; border-radius: 12px; padding: 18px;
      margin-bottom: 12px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.04);
    }
    .header .academy { color: #777; font-size: 13px; }
    h1 { margin: 6px 0 4px; font-size: 24px; }
    .summary { color: #555; font-size: 14px; }
    h2 { margin: 0 0 10px; font-size: 16px; }
    .amount { font-size: 28px; font-weight: 700; }
    .status { display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 13px; margin-top: 6px; }
    .status-paid { background: #dcf7e3; color: #2e7d32; }
    .status-issued { background: #fff3cd; color: #8a6d3b; }
    .status-overdue { background: #fde0e0; color: #c62828; }
    ul.line-items { list-style: none; padding: 0; margin: 14px 0 0; font-size: 14px; color: #444; }
    ul.line-items li { display: flex; justify-content: space-between; padding: 4px 0; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th, td { text-align: left; padding: 8px 4px; border-bottom: 1px solid #eee; }
    th { color: #888; font-weight: 500; }
    .ok { color: #2e7d32; }
    .absent { color: #c62828; }
    .empty { color: #999; text-align: center; padding: 16px; }
    .foot { color: #aaa; font-size: 12px; text-align: center; margin: 20px 0 40px; }
  </style>
</head>
<body>${body}</body>
</html>`;
}
