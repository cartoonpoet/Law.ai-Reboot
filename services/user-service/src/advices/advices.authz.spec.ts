import { checkCanSeeSecretCc, checkCanView, getAdvicePermissions, type AdviceAuthzTarget } from "./advices.authz";

describe("법률자문 권한", () => {
  const target = (over: Partial<AdviceAuthzTarget> = {}): AdviceAuthzTarget => ({
    status: "reviewing",
    requesterId: "requester",
    createdById: "writer",
    ownerId: "owner",
    ccUserIds: ["cc"],
    ...over,
  });

  describe("열람", () => {
    it("법무팀은 관계없는 자문도 본다", () => {
      expect(checkCanView({ id: "legal", role: "inHouseCounsel" }, target())).toBe(true);
      expect(checkCanView({ id: "manager", role: "contractManager" }, target())).toBe(true);
    });

    it("외부 변호사는 자기가 담당한 자문만 본다", () => {
      expect(checkCanView({ id: "owner", role: "outsideCounsel" }, target())).toBe(true);
      expect(checkCanView({ id: "outside", role: "outsideCounsel" }, target())).toBe(false);
    });

    it("일반 사용자는 요청·작성·참조된 자문만 본다", () => {
      expect(checkCanView({ id: "requester", role: "general" }, target())).toBe(true);
      expect(checkCanView({ id: "writer", role: "general" }, target())).toBe(true);
      expect(checkCanView({ id: "cc", role: "general" }, target())).toBe(true);
      expect(checkCanView({ id: "stranger", role: "general" }, target())).toBe(false);
    });

    it("비밀 참조는 법무팀과 작성자만 본다", () => {
      expect(checkCanSeeSecretCc({ id: "writer", role: "general" }, target())).toBe(true);
      expect(checkCanSeeSecretCc({ id: "legal", role: "inHouseCounsel" }, target())).toBe(true);
      expect(checkCanSeeSecretCc({ id: "requester", role: "general" }, target())).toBe(false);
    });
  });

  describe("할 수 있는 일", () => {
    it("담당자는 검토 중에 추가 질의·회신을 할 수 있고 요청자 답변은 못 한다", () => {
      const permissions = getAdvicePermissions({ id: "owner", role: "inHouseCounsel" }, target());
      expect(permissions).toEqual({ canAssign: true, canFollowup: true, canAnswer: true, canReply: false, canClose: false });
    });

    it("담당이 아닌 법무팀원은 배정만 할 수 있다", () => {
      const permissions = getAdvicePermissions({ id: "legal", role: "inHouseCounsel" }, target());
      expect(permissions).toEqual({ canAssign: true, canFollowup: false, canAnswer: false, canReply: false, canClose: false });
    });

    it("요청자는 추가 질의에 답하고, 회신 뒤에는 다시 묻거나 종결할 수 있다", () => {
      const requester = { id: "requester", role: "general" as const };
      expect(getAdvicePermissions(requester, target({ status: "waitingRequester" })).canReply).toBe(true);
      expect(getAdvicePermissions(requester, target({ status: "answered" }))).toMatchObject({ canReply: true, canClose: true });
      expect(getAdvicePermissions(requester, target({ status: "received" })).canReply).toBe(false);
    });

    it("종결된 자문에서는 아무것도 할 수 없다", () => {
      const closed = target({ status: "closed" });
      expect(Object.values(getAdvicePermissions({ id: "owner", role: "inHouseCounsel" }, closed)).some(Boolean)).toBe(false);
      expect(Object.values(getAdvicePermissions({ id: "requester", role: "general" }, closed)).some(Boolean)).toBe(false);
    });
  });
});
