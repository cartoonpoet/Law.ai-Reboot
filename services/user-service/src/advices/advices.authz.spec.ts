import { checkCanSeeSecretCc, checkCanSeeUnpublished, checkCanView, getAdvicePermissions, type AdviceAuthzTarget } from "./advices.authz";

describe("법률자문 권한", () => {
  const target = (over: Partial<AdviceAuthzTarget> = {}): AdviceAuthzTarget => ({
    status: "reviewing",
    requesterId: "requester",
    createdById: "writer",
    ownerId: "owner",
    ccUserIds: ["cc"],
    approverIds: ["boss"],
    answerApproverIds: ["head"],
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

    it("결재선에 든 사람은 결재하려고 자문을 볼 수 있다", () => {
      expect(checkCanView({ id: "boss", role: "general" }, target())).toBe(true);
    });

    it("결재 중인 회신은 법무팀·담당자·회신 결재자만 본다", () => {
      expect(checkCanSeeUnpublished({ id: "owner", role: "outsideCounsel" }, target())).toBe(true);
      expect(checkCanSeeUnpublished({ id: "head", role: "general" }, target())).toBe(true);
      expect(checkCanSeeUnpublished({ id: "requester", role: "general" }, target())).toBe(false);
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
      expect(permissions).toEqual({ canAssign: true, canFollowup: true, canAnswer: true, canReply: false, canClose: false, canResubmitRequest: false });
    });

    it("담당이 아닌 법무팀원은 배정만 할 수 있다", () => {
      const permissions = getAdvicePermissions({ id: "legal", role: "inHouseCounsel" }, target());
      expect(permissions).toEqual({ canAssign: true, canFollowup: false, canAnswer: false, canReply: false, canClose: false, canResubmitRequest: false });
    });

    it("요청자는 추가 질의에 답하고, 회신 뒤에는 다시 묻거나 종결할 수 있다", () => {
      const requester = { id: "requester", role: "general" as const };
      expect(getAdvicePermissions(requester, target({ status: "waitingRequester" })).canReply).toBe(true);
      expect(getAdvicePermissions(requester, target({ status: "answered" }))).toMatchObject({ canReply: true, canClose: true });
      expect(getAdvicePermissions(requester, target({ status: "received" })).canReply).toBe(false);
    });

    it("결재 중에는 담당자·요청자 모두 진행 동작을 할 수 없다", () => {
      ["requestApproval", "answerApproval"].forEach((status) => {
        const pending = target({ status: status as AdviceAuthzTarget["status"] });
        expect(Object.values(getAdvicePermissions({ id: "owner", role: "inHouseCounsel" }, pending)).some(Boolean)).toBe(false);
        expect(Object.values(getAdvicePermissions({ id: "requester", role: "general" }, pending)).some(Boolean)).toBe(false);
      });
    });

    it("요청 결재가 반려되면 작성자만 다시 올릴 수 있다", () => {
      const rejected = target({ status: "requestRejected" });
      expect(getAdvicePermissions({ id: "writer", role: "general" }, rejected).canResubmitRequest).toBe(true);
      expect(getAdvicePermissions({ id: "requester", role: "general" }, rejected).canResubmitRequest).toBe(false);
    });

    it("종결된 자문에서는 아무것도 할 수 없다", () => {
      const closed = target({ status: "closed" });
      expect(Object.values(getAdvicePermissions({ id: "owner", role: "inHouseCounsel" }, closed)).some(Boolean)).toBe(false);
      expect(Object.values(getAdvicePermissions({ id: "requester", role: "general" }, closed)).some(Boolean)).toBe(false);
    });
  });
});
