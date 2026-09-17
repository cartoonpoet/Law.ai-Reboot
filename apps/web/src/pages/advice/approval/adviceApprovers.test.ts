import { describe, expect, it } from "vitest";
import { checkNeedsApproval, createDraftApprover } from "./adviceApprovers";

describe("자문 결재선", () => {
  it("올리는 사람을 기안자로 만든다(부서가 없으면 빈 칸)", () => {
    expect(createDraftApprover({ id: "u1", name: "김수현", departmentName: null })).toEqual({
      userId: "u1",
      name: "김수현",
      dept: "",
      type: "draft",
    });
  });

  it("결재·합의 단계가 있을 때만 결재를 거친다", () => {
    const draft = createDraftApprover({ id: "u1", name: "김수현", departmentName: "영업1팀" });
    expect(checkNeedsApproval([draft])).toBe(false);
    expect(checkNeedsApproval([draft, { userId: "u2", name: "정민규", dept: "영업1팀", type: "refer" }])).toBe(false);
    expect(checkNeedsApproval([draft, { userId: "u3", name: "한은정", dept: "법무팀", type: "agree" }])).toBe(true);
  });
});
