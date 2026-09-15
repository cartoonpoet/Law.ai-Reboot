import { describe, it, expect } from "vitest";
import type { AiAnalysisDto } from "@lawai/contracts";
import { describeRenewalTerms, formatExpiryDday, parseRenewalTerms, toRenewalTermsState } from "./renewalTerms";

const NOW = new Date(2026, 8, 16, 10);

const analysis = (over: Partial<AiAnalysisDto>): AiAnalysisDto => ({
  kind: "renewalTerms",
  status: "succeeded",
  result: null,
  errorMessage: null,
  triggeredByUserId: "u1",
  updatedAt: "2026-09-16T00:00:00.000Z",
  ...over,
});

const autoRenewal = {
  autoRenewal: true,
  renewalPeriod: "1년",
  noticeDays: 30,
  noticeDeadline: "2026-09-26",
  clause: "제12조 (계약기간의 연장)",
  summary: "만료 30일 전까지 해지 통지가 없으면 1년 자동 연장",
};

describe("renewalTerms", () => {
  it("AI 결과를 자동갱신 조항으로 읽고, 모양이 다르면 null", () => {
    expect(parseRenewalTerms(autoRenewal)).toEqual(autoRenewal);
    expect(parseRenewalTerms({ autoRenewal: "yes", summary: "x" })).toBeNull();
    expect(parseRenewalTerms({ autoRenewal: false })).toBeNull();
    expect(parseRenewalTerms(null)).toBeNull();
  });

  it("분석 상태에 따라 칸 상태를 정한다", () => {
    expect(toRenewalTermsState(null, false)).toEqual({ status: "none" });
    expect(toRenewalTermsState(null, true)).toEqual({ status: "reading" });
    expect(toRenewalTermsState(analysis({ status: "running" }), false)).toEqual({ status: "reading" });
    expect(toRenewalTermsState(analysis({ status: "skipped" }), false)).toMatchObject({ status: "unavailable" });
    expect(toRenewalTermsState(analysis({ status: "failed" }), false)).toMatchObject({ status: "unavailable" });
    expect(toRenewalTermsState(analysis({ result: autoRenewal }), false)).toEqual({ status: "done", terms: autoRenewal });
  });

  it("자동갱신이면 통지 기한과 남은 날을, 아니면 만료된다고 알려준다", () => {
    expect(describeRenewalTerms(autoRenewal, NOW)).toEqual({
      headline: "자동갱신 1년 · 통지 기한 2026-09-26 (D-10)",
      tone: "warning",
    });
    expect(describeRenewalTerms({ ...autoRenewal, noticeDeadline: "2026-09-01" }, NOW).headline).toBe(
      "자동갱신 1년 · 통지 기한 지남(2026-09-01)",
    );
    expect(describeRenewalTerms({ ...autoRenewal, autoRenewal: false }, NOW)).toEqual({
      headline: "자동갱신 조항 없음 — 그대로 두면 만료돼요",
      tone: "info",
    });
  });

  it("만료까지 남은 날을 D-day 로", () => {
    expect([formatExpiryDday(3), formatExpiryDday(0), formatExpiryDday(-5), formatExpiryDday(null)]).toEqual([
      "D-3",
      "D-DAY",
      "D+5",
      "-",
    ]);
  });
});
