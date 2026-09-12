import { OpenAiProvider } from "./openai.provider";

describe("OpenAiProvider", () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("listModels: 실제 OpenAI 모델 ID 를 등급과 함께 반환한다", async () => {
    const provider = new OpenAiProvider();
    const models = await provider.listModels();
    // id 는 OpenAI API 에 그대로 전달된다 — 가상의 ID 가 섞이면 모든 호출이 404 가 되므로 고정한다.
    expect(models).toEqual([
      { id: "gpt-4o-mini", label: "GPT-4o mini (경량)", tier: "economy" },
      { id: "gpt-4o", label: "GPT-4o (표준, 기본값)", tier: "standard" },
      { id: "gpt-4.1", label: "GPT-4.1 (고정밀)", tier: "precision" },
    ]);
    expect(models.some((m) => m.tier === "standard")).toBe(true);
  });

  it("analyze: 200 응답의 JSON 컨텐츠를 파싱해 result 로 반환", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"risks":[{"level":"high","clause":"제12조"}]}' } }],
      }),
    }) as unknown as typeof fetch;
    const provider = new OpenAiProvider();
    const { result } = await provider.analyze({
      kind: "risk", model: "gpt-4o-mini", apiKey: "sk-test", payload: { text: "계약서 본문" },
    });
    expect(result).toEqual({ risks: [{ level: "high", clause: "제12조" }] });
  });

  it("analyze: 401 응답이면 인증 실패 에러를 던진다", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401, text: async () => "invalid api key" }) as unknown as typeof fetch;
    const provider = new OpenAiProvider();
    await expect(
      provider.analyze({ kind: "risk", model: "gpt-4o-mini", apiKey: "sk-bad", payload: {} }),
    ).rejects.toThrow(/401|인증/);
  });

  it("analyze: 429(레이트리밋)면 명확한 에러 메시지를 던진다", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 429, text: async () => "rate limited" }) as unknown as typeof fetch;
    const provider = new OpenAiProvider();
    await expect(
      provider.analyze({ kind: "risk", model: "gpt-4o-mini", apiKey: "sk-x", payload: {} }),
    ).rejects.toThrow(/429|rate/i);
  });
});
