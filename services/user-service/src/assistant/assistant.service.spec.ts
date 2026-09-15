import { RpcException } from "@nestjs/microservices";
import type { TenantContext } from "@lawai/contracts";
import { AssistantService } from "./assistant.service";

const ctx: TenantContext = { tenantId: "T1", isSystemAdmin: false };

describe("AssistantService", () => {
  let prisma: {
    user: { findUnique: jest.Mock };
    userTenant: { findFirst: jest.Mock; findMany: jest.Mock };
    contract: { findMany: jest.Mock };
  };
  let credentials: { getDecryptedKeyFor: jest.Mock };
  let aiClient: { chat: jest.Mock };
  let approvals: { inbox: jest.Mock };
  let svc: AssistantService;

  beforeEach(() => {
    prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ name: "손준호" }) },
      userTenant: {
        findFirst: jest.fn().mockResolvedValue({ role: "inHouseCounsel" }),
        findMany: jest.fn().mockResolvedValue([{ user: { id: "u-kim", name: "김법무", department: { name: "법무팀" } } }]),
      },
      contract: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "c-un",
            code: "C-1",
            title: "유지보수 계약",
            status: "unassigned",
            dueDate: null,
            ownerId: null,
            requesterId: "u-req",
            createdById: "u-req",
            owner: null,
            requester: { name: "박현경" },
          },
        ]),
      },
    };
    credentials = { getDecryptedKeyFor: jest.fn().mockResolvedValue({ provider: "openai", model: "gpt-4o-mini", apiKey: "sk-test" }) };
    aiClient = {
      chat: jest.fn().mockResolvedValue({
        content: JSON.stringify({ reply: "김법무에게 배정할까요?", actions: [{ type: "assign", contractId: "c-un", ownerId: "u-kim" }] }),
      }),
    };
    approvals = { inbox: jest.fn().mockResolvedValue({ pending: [], processed: [] }) };
    svc = new AssistantService(prisma as never, credentials as never, aiClient as never, approvals as never);
  });

  const ask = (content = "미배정 계약 배정해줘") =>
    svc.chat({ messages: [{ role: "user", content }], screen: "대시보드", viewerId: "me", tenantContext: ctx });

  it("로그인 정보가 없으면 401, 마지막 메시지가 사용자 메시지가 아니면 400", async () => {
    await expect(svc.chat({ messages: [{ role: "user", content: "hi" }], screen: "x" })).rejects.toBeInstanceOf(RpcException);
    await expect(
      svc.chat({ messages: [{ role: "assistant", content: "hi" }], screen: "x", viewerId: "me", tenantContext: ctx }),
    ).rejects.toBeInstanceOf(RpcException);
  });

  it("내 AI 연동이 없으면 AI 를 부르지 않고 설정 안내를 돌려준다", async () => {
    credentials.getDecryptedKeyFor.mockResolvedValue(null);
    const res = await ask();
    expect(res.needsSetup).toBe(true);
    expect(res.actions).toEqual([{ type: "open", label: "AI 설정하러 가기", path: "/system" }]);
    expect(aiClient.chat).not.toHaveBeenCalled();
  });

  it("내 키·모델로 업무 데이터를 담아 묻고, 검증된 배정 제안을 돌려준다", async () => {
    const res = await ask();
    const call = aiClient.chat.mock.calls[0][0];
    expect(call).toMatchObject({ model: "gpt-4o-mini", apiKey: "sk-test", messages: [{ role: "user", content: "미배정 계약 배정해줘" }] });
    expect(call.system).toContain("유지보수 계약");
    expect(call.system).toContain("김법무");
    expect(res).toEqual({
      reply: "김법무에게 배정할까요?",
      actions: [{ type: "assign", contractId: "c-un", contractTitle: "유지보수 계약", ownerId: "u-kim", ownerName: "김법무" }],
      needsSetup: false,
    });
  });

  it("계약 조회는 테넌트·진행 중 상태로 한정하고, 배정 권한자면 미배정 계약도 포함한다", async () => {
    await ask();
    const where = prisma.contract.findMany.mock.calls[0][0].where;
    expect(where).toMatchObject({ deletedAt: null, tenantId: "T1" });
    expect(where.OR).toContainEqual({ status: "unassigned" });
  });

  it("배정 권한이 없는 역할이면 미배정 계약·담당자 목록을 조회하지 않는다", async () => {
    prisma.userTenant.findFirst.mockResolvedValue({ role: "general" });
    await ask();
    expect(prisma.contract.findMany.mock.calls[0][0].where.OR).not.toContainEqual({ status: "unassigned" });
    expect(prisma.userTenant.findMany).not.toHaveBeenCalled();
  });

  it("대화 기록은 최근 12개만, 긴 메시지는 잘라서 보낸다", async () => {
    const history = Array.from({ length: 15 }, (_, i) => ({ role: i % 2 === 0 ? "user" : "assistant", content: `m${i}` })) as never[];
    await svc.chat({ messages: [...history, { role: "user", content: "가".repeat(3000) }], screen: "대시보드", viewerId: "me", tenantContext: ctx });
    const sent = aiClient.chat.mock.calls[0][0].messages;
    expect(sent).toHaveLength(12);
    expect(sent[sent.length - 1].content).toHaveLength(2000);
  });

  describe("brief", () => {
    const BRIEF = { headline: "오늘 챙길 일은 1건이에요.", points: [{ tone: "danger", text: "유지보수 계약이 미배정이에요.", action: { type: "assign", contractId: "c-un", ownerId: "u-kim" } }] };
    const getBrief = (refresh = false) => svc.brief({ viewerId: "me", tenantContext: ctx, refresh });

    beforeEach(() => {
      aiClient.chat.mockResolvedValue({ content: JSON.stringify(BRIEF) });
    });

    it("키가 없으면 AI 를 부르지 않고 설정 안내", async () => {
      credentials.getDecryptedKeyFor.mockResolvedValue(null);
      const res = await getBrief();
      expect(res).toMatchObject({ needsSetup: true, points: [] });
      expect(aiClient.chat).not.toHaveBeenCalled();
    });

    it("처리할 계약·결재가 없으면 AI 를 부르지 않는다", async () => {
      prisma.contract.findMany.mockResolvedValue([]);
      const res = await getBrief();
      expect(res.headline).toBe("지금 처리할 계약이나 결재가 없어요.");
      expect(aiClient.chat).not.toHaveBeenCalled();
    });

    it("내 데이터로 브리핑을 만들고, 행동은 검증해 채운다", async () => {
      const res = await getBrief();
      expect(aiClient.chat.mock.calls[0][0].system).toContain("오늘의 브리핑");
      expect(res.headline).toBe("오늘 챙길 일은 1건이에요.");
      expect(res.points[0].action).toEqual({ type: "assign", contractId: "c-un", contractTitle: "유지보수 계약", ownerId: "u-kim", ownerName: "김법무" });
    });

    it("데이터가 그대로면 캐시를 쓰고, 새로 정리(refresh)나 데이터 변경 시 다시 만든다", async () => {
      await getBrief();
      await getBrief();
      expect(aiClient.chat).toHaveBeenCalledTimes(1);

      await getBrief(true);
      expect(aiClient.chat).toHaveBeenCalledTimes(2);

      prisma.contract.findMany.mockResolvedValue([]);
      approvals.inbox.mockResolvedValue({ pending: [{ lineId: "l1", targetType: "contract", targetId: "c9", title: "품의", submittedByName: "박", myStepOrder: 0, totalSteps: 1 }], processed: [] });
      await getBrief();
      expect(aiClient.chat).toHaveBeenCalledTimes(3);
    });

    it("AI 응답 형식이 틀리면 안내를 돌려주고 캐시하지 않는다", async () => {
      aiClient.chat.mockResolvedValue({ content: "not json" });
      const res = await getBrief();
      expect(res.headline).toMatch(/만들지 못했어요/);
      await getBrief();
      expect(aiClient.chat).toHaveBeenCalledTimes(2);
    });

    it("AI 호출 실패는 502", async () => {
      aiClient.chat.mockRejectedValue(new Error("OpenAI 레이트리밋(429)"));
      await expect(getBrief()).rejects.toMatchObject({ error: { status: 502 } });
    });
  });

  it("AI 호출이 실패하면 502 로 사유를 알린다", async () => {
    aiClient.chat.mockRejectedValue(new Error("OpenAI 레이트리밋(429)"));
    await expect(ask()).rejects.toMatchObject({ error: { status: 502, message: expect.stringContaining("429") } });
  });
});
