import type { AiAnalysisDto } from "@lawai/contracts";
import { describe, expect, it } from "vitest";
import { summarizeAiAnalysis } from "./summarizeAiAnalysis";

const createAnalysis = (overrides: Partial<AiAnalysisDto>): AiAnalysisDto => ({
  kind: "risk",
  status: "succeeded",
  result: {},
  errorMessage: null,
  triggeredByUserId: "u1",
  updatedAt: "2026-09-14T00:00:00.000Z",
  ...overrides,
});

describe("summarizeAiAnalysis", () => {
  it("분석이 없거나 실패·미설정이면 표시하지 않는다", () => {
    expect(summarizeAiAnalysis(null)).toBeNull();
    expect(summarizeAiAnalysis(createAnalysis({ status: "failed" }))).toBeNull();
    expect(summarizeAiAnalysis(createAnalysis({ status: "skipped" }))).toBeNull();
  });

  it("진행 중이면 분석 중 안내", () => {
    expect(summarizeAiAnalysis(createAnalysis({ status: "running" }))).toEqual({ text: "AI 분석 중이에요", tone: "muted" });
  });

  it("리스크가 있으면 등급별 건수와 가장 위험한 조항, 고위험이면 빨강", () => {
    const insight = summarizeAiAnalysis(
      createAnalysis({
        result: {
          risks: [
            { level: "medium", clause: "지체상금", finding: "상한 없음" },
            { level: "high", clause: "손해배상 한도", finding: "300%" },
            { level: "low", clause: "관할", finding: "서울" },
          ],
        },
      }),
    );
    expect(insight).toEqual({ text: "고위험 1 · 주의 1 · 참고 1 — 손해배상 한도", tone: "danger" });
  });

  it("주의만 있으면 주황", () => {
    const insight = summarizeAiAnalysis(createAnalysis({ result: { risks: [{ level: "medium", clause: "해지", finding: "일방 해지" }] } }));
    expect(insight?.tone).toBe("warning");
  });

  it("리스크가 없으면 요약, 요약도 없으면 첫 핵심 사실", () => {
    expect(summarizeAiAnalysis(createAnalysis({ result: { summary: "표준 NDA 와 차이 없음" } }))).toEqual({
      text: "표준 NDA 와 차이 없음",
      tone: "info",
    });
    expect(summarizeAiAnalysis(createAnalysis({ result: { keyFacts: [{ label: "금액", value: "월 840만원" }] } }))?.text).toBe("금액: 월 840만원");
  });

  it("긴 문장은 60자로 줄인다", () => {
    const insight = summarizeAiAnalysis(createAnalysis({ result: { summary: "가".repeat(80) } }));
    expect(insight?.text).toHaveLength(60);
    expect(insight?.text.endsWith("…")).toBe(true);
  });

  it("알 수 없는 결과 형태면 표시하지 않는다", () => {
    expect(summarizeAiAnalysis(createAnalysis({ result: "oops" }))).toBeNull();
  });
});
