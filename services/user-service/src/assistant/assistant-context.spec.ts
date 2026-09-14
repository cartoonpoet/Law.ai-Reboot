import { buildAssistantSystemPrompt } from "./assistant-context";
import type { AssistantContext } from "./assistant-context";

const context: AssistantContext = {
  viewer: { id: "me", name: "손준호", role: "general", canAssign: false },
  contracts: [
    { id: "c1", code: "C-1", title: "유지보수 계약", status: "legalReview", dueDate: "2026-09-16T00:00:00.000Z", ownerId: "x", ownerName: "김법무", requesterName: "손준호", relations: ["요청"] },
  ],
  approvals: [{ lineId: "l1", contractId: "c1", title: "NDA 체결 품의", submittedByName: "박요청", step: "1/2" }],
  assignees: [{ id: "u-kim", name: "김법무", dept: "법무팀" }],
};

describe("buildAssistantSystemPrompt", () => {
  it("사용자·화면·오늘 날짜와 응답 JSON 형식을 담는다", () => {
    const prompt = buildAssistantSystemPrompt({ context, screen: "대시보드", today: "2026-09-14" });
    expect(prompt).toContain("손준호(일반 사용자)");
    expect(prompt).toContain('"대시보드"');
    expect(prompt).toContain("2026-09-14");
    expect(prompt).toContain('"reply": string');
  });

  it("계약·결재 데이터를 상태 이름과 함께 넣는다", () => {
    const prompt = buildAssistantSystemPrompt({ context, screen: "대시보드", today: "2026-09-14" });
    expect(prompt).toContain('"title":"유지보수 계약"');
    expect(prompt).toContain('"statusLabel":"법무 검토 중"');
    expect(prompt).toContain("NDA 체결 품의");
  });

  it("배정 권한이 없으면 담당자 목록을 넘기지 않고 배정 제안을 막는다", () => {
    const prompt = buildAssistantSystemPrompt({ context, screen: "대시보드", today: "2026-09-14" });
    expect(prompt).toContain('"assignees":[]');
    expect(prompt).toContain("배정 권한이 없으니 제안하지 마세요");
  });

  it("배정 권한이 있으면 담당자 목록을 넘긴다", () => {
    const prompt = buildAssistantSystemPrompt({
      context: { ...context, viewer: { ...context.viewer, role: "inHouseCounsel", canAssign: true } },
      screen: "계약 상세",
      today: "2026-09-14",
    });
    expect(prompt).toContain('"name":"김법무"');
    expect(prompt).not.toContain("배정 권한이 없으니");
  });
});
