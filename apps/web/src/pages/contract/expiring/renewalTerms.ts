import type { AiAnalysisDto, RenewalTerms } from "@lawai/contracts";
import { getDaysLeft } from "../../dashboard/getDaysLeft";

export const RENEWAL_TERMS_KIND = "renewalTerms";

// 만료 관리 표의 "AI 판단" 칸 상태.
export type RenewalTermsStateTypes =
  | { status: "none" } // 아직 안 읽음
  | { status: "reading" } // 읽는 중(요청했거나 분석 중)
  | { status: "unavailable"; reason: string } // 연동 없음·실패 등
  | { status: "done"; terms: RenewalTerms };

export type RenewalTermsToneTypes = "warning" | "info";

const toText = (value: unknown): string | null => (typeof value === "string" && value.trim() ? value.trim() : null);

/** AI 결과(unknown) → 자동갱신 조항. 모양이 다르면 null. */
export const parseRenewalTerms = (result: unknown): RenewalTerms | null => {
  if (!result || typeof result !== "object") return null;
  const raw = result as Record<string, unknown>;
  const summary = toText(raw.summary);
  if (typeof raw.autoRenewal !== "boolean" || !summary) return null;
  return {
    autoRenewal: raw.autoRenewal,
    renewalPeriod: toText(raw.renewalPeriod),
    noticeDays: typeof raw.noticeDays === "number" ? raw.noticeDays : null,
    noticeDeadline: toText(raw.noticeDeadline),
    clause: toText(raw.clause),
    summary,
  };
};

/** 분석 행 + "방금 읽기를 눌렀는지" → 칸 상태. */
export const toRenewalTermsState = (analysis: AiAnalysisDto | null, isRequested: boolean): RenewalTermsStateTypes => {
  if (!analysis) return isRequested ? { status: "reading" } : { status: "none" };
  if (analysis.status === "pending" || analysis.status === "running") return { status: "reading" };
  if (analysis.status === "skipped") return { status: "unavailable", reason: "AI 연동이 없어 읽지 못했어요" };
  if (analysis.status === "failed") return { status: "unavailable", reason: "읽다가 실패했어요" };
  const terms = parseRenewalTerms(analysis.result);
  return terms ? { status: "done", terms } : { status: "unavailable", reason: "결과를 알아볼 수 없어요" };
};

const describeNoticeDeadline = (deadline: string, now: Date): string => {
  const daysLeft = getDaysLeft(deadline, now);
  if (daysLeft === null) return `통지 기한 ${deadline}`;
  if (daysLeft < 0) return `통지 기한 지남(${deadline})`;
  return `통지 기한 ${deadline} (D-${daysLeft})`;
};

/** 자동갱신 조항 → 표에 붙일 한 줄. 자동갱신이면 통지 기한을 놓치지 않게 경고색. */
export const describeRenewalTerms = (
  terms: RenewalTerms,
  now: Date,
): { headline: string; tone: RenewalTermsToneTypes } => {
  if (!terms.autoRenewal) return { headline: "자동갱신 조항 없음 — 그대로 두면 만료돼요", tone: "info" };
  const period = terms.renewalPeriod ? ` ${terms.renewalPeriod}` : "";
  if (!terms.noticeDeadline) return { headline: `자동갱신${period} — 통지 기한을 찾지 못했어요`, tone: "warning" };
  return { headline: `자동갱신${period} · ${describeNoticeDeadline(terms.noticeDeadline, now)}`, tone: "warning" };
};

/** 만료까지 남은 날 → "D-3" / "D-DAY" / "D+5"(지남). */
export const formatExpiryDday = (daysLeft: number | null): string => {
  if (daysLeft === null) return "-";
  if (daysLeft === 0) return "D-DAY";
  return daysLeft > 0 ? `D-${daysLeft}` : `D+${-daysLeft}`;
};
