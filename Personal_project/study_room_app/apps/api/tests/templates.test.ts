import { strict as assert } from "node:assert";
import { test } from "node:test";
import { localizeAbsenceReason, renderTemplate } from "../src/services/templates";

test("renderTemplate substitutes required variables", () => {
  const body = renderTemplate("check_in", {
    academyName: "민서영어공부방",
    studentName: "김민서",
    time: "16:02",
  });
  assert.match(body, /민서영어공부방/);
  assert.match(body, /김민서 학생이 16:02에 도착했습니다\./);
});

test("renderTemplate throws on missing variable", () => {
  assert.throws(
    () => renderTemplate("invoice_issued", { academyName: "x" }),
    /missing vars/
  );
});

test("localizeAbsenceReason maps known codes and falls back", () => {
  assert.equal(localizeAbsenceReason("sick"), "병결");
  assert.equal(localizeAbsenceReason("personal"), "개인사정");
  assert.equal(localizeAbsenceReason(null), "미기재");
  assert.equal(localizeAbsenceReason("unknown_code"), "unknown_code");
});
