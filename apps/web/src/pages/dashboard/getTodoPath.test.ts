import { describe, expect, it } from "vitest";
import { getTodoPath } from "./getTodoPath";

describe("getTodoPath", () => {
  it("계약은 계약 상세로 간다", () => {
    expect(getTodoPath({ id: "C20260609-0002", type: "계약" })).toBe("/contract/C20260609-0002");
  });

  it("결재는 결재 대기함으로 간다", () => {
    expect(getTodoPath({ id: "AP20260601-0007", type: "결재" })).toBe("/approvals/inbox");
  });

  it("상세 화면이 없는 업무는 이동하지 않는다", () => {
    expect(getTodoPath({ id: "L20260520-0003", type: "송무" })).toBeNull();
    expect(getTodoPath({ id: "IP20260415-0005", type: "지식재산" })).toBeNull();
  });
});
