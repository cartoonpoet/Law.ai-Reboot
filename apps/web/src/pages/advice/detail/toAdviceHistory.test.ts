import { describe, expect, it } from "vitest";
import type { AdviceResponse } from "@lawai/contracts";
import { toAdviceHistory } from "./toAdviceHistory";

const person = (name: string) => ({ id: name, name, dept: null });

const advice = {
  createdAt: "2026-09-14T01:00:00.000Z",
  createdBy: person("김수현"),
  closedAt: null,
  messages: [
    { id: "m1", kind: "followup", body: "확인 부탁", author: person("박지훈"), createdAt: "2026-09-15T05:40:00.000Z" },
    { id: "m2", kind: "reply", body: "답변", author: person("김수현"), createdAt: "2026-09-15T08:05:00.000Z" },
  ],
} as unknown as AdviceResponse;

describe("toAdviceHistory", () => {
  it("최신이 위, 가장 최근 일을 지금으로 표시한다", () => {
    const items = toAdviceHistory(advice);
    expect(items.map((item) => item.title)).toEqual(["답변 등록", "추가 질의 등록", "자문 요청 접수"]);
    expect(items.map((item) => item.status)).toEqual(["current", "done", "done"]);
    expect(items[0].description).toContain("김수현");
  });

  it("종결되면 종결이 맨 위로 온다", () => {
    const items = toAdviceHistory({ ...advice, closedAt: "2026-09-20T00:00:00.000Z" });
    expect(items[0].title).toBe("종결");
  });
});
