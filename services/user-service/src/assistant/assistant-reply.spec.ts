import { parseAssistantReply } from "./assistant-reply";
import type { AssistantContext } from "./assistant-context";

const context: AssistantContext = {
  viewer: { id: "me", name: "손준호", role: "inHouseCounsel", canAssign: true },
  contracts: [
    { id: "c-un", code: "C-1", title: "유지보수 계약", status: "unassigned", dueDate: null, ownerId: null, ownerName: null, requesterName: "박현경", relations: ["배정대상"] },
    { id: "c-as", code: "C-2", title: "공급 계약", status: "assigning", dueDate: null, ownerId: "me", ownerName: "손준호", requesterName: null, relations: ["담당"] },
    { id: "c-other", code: "C-3", title: "남의 계약", status: "assigning", dueDate: null, ownerId: "x", ownerName: "김법무", requesterName: null, relations: ["요청"] },
  ],
  approvals: [],
  assignees: [{ id: "u-kim", name: "김법무", dept: "법무팀" }],
};

const reply = (value: unknown) => parseAssistantReply(JSON.stringify(value), context);

describe("parseAssistantReply", () => {
  it("JSON 이 아니거나 reply 가 없으면 다시 물어봐 달라는 안내", () => {
    expect(parseAssistantReply("그냥 문장", context).reply).toMatch(/다시 물어봐/);
    expect(reply({ actions: [] }).reply).toMatch(/다시 물어봐/);
  });

  it("검증된 배정 제안은 계약 제목·담당자 이름을 채워 돌려준다", () => {
    const res = reply({ reply: "김법무에게 배정할까요?", actions: [{ type: "assign", contractId: "c-un", ownerId: "u-kim" }] });
    expect(res).toEqual({
      reply: "김법무에게 배정할까요?",
      actions: [{ type: "assign", contractId: "c-un", contractTitle: "유지보수 계약", ownerId: "u-kim", ownerName: "김법무" }],
      needsSetup: false,
    });
  });

  it("미배정이 아니거나, 모르는 담당자이거나, 배정 권한이 없으면 배정 제안을 버린다", () => {
    expect(reply({ reply: "r", actions: [{ type: "assign", contractId: "c-as", ownerId: "u-kim" }] }).actions).toEqual([]);
    expect(reply({ reply: "r", actions: [{ type: "assign", contractId: "c-un", ownerId: "u-ghost" }] }).actions).toEqual([]);
    const noPermission = parseAssistantReply(
      JSON.stringify({ reply: "r", actions: [{ type: "assign", contractId: "c-un", ownerId: "u-kim" }] }),
      { ...context, viewer: { ...context.viewer, canAssign: false } },
    );
    expect(noPermission.actions).toEqual([]);
  });

  it("검토 시작은 내가 담당인 배정 중 계약만", () => {
    const res = reply({ reply: "r", actions: [{ type: "startReview", contractId: "c-as" }, { type: "startReview", contractId: "c-other" }] });
    expect(res.actions).toEqual([{ type: "startReview", contractId: "c-as", contractTitle: "공급 계약" }]);
  });

  it("화면 열기는 알려진 경로와 데이터에 있는 계약만, 모르는 경로·계약은 버린다", () => {
    const res = reply({
      reply: "r",
      actions: [
        { type: "open", label: "결재 대기함", path: "/approvals/inbox" },
        { type: "open", label: "계약 보기", path: "/contract/c-un" },
        { type: "open", label: "밖으로", path: "https://evil.example" },
        { type: "open", label: "없는 계약", path: "/contract/c-ghost" },
      ],
    });
    expect(res.actions.map((a) => (a.type === "open" ? a.path : a.type))).toEqual(["/approvals/inbox", "/contract/c-un"]);
  });

  it("중복을 없애고 최대 3개", () => {
    const res = reply({
      reply: "r",
      actions: [
        { type: "open", label: "a", path: "/" },
        { type: "open", label: "b", path: "/" },
        { type: "open", label: "c", path: "/contract/list" },
        { type: "open", label: "d", path: "/approvals/inbox" },
        { type: "startReview", contractId: "c-as" },
      ],
    });
    expect(res.actions).toHaveLength(3);
  });
});
