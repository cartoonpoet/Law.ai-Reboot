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

  it("readDocument: PDF 를 파일 입력(data URL)으로 보내고 옮겨 적은 글자를 돌려준다", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '{"text":"제1조 (목적) 스캔 본문"}' } }] }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    const provider = new OpenAiProvider();

    const { text } = await provider.readDocument({
      model: "gpt-4o", apiKey: "sk-test", fileName: "계약서.pdf", mimeType: "application/pdf", fileBase64: "JVBERg==",
    });

    expect(text).toBe("제1조 (목적) 스캔 본문");
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.model).toBe("gpt-4o");
    expect(body.response_format).toEqual({ type: "json_object" });
    expect(body.messages[1].content[0]).toEqual({
      type: "file",
      file: { filename: "계약서.pdf", file_data: "data:application/pdf;base64,JVBERg==" },
    });
  });

  it("readDocument: 응답에 text 가 없으면 에러를 던진다", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '{"summary":"요약"}' } }] }),
    }) as unknown as typeof fetch;
    const provider = new OpenAiProvider();
    await expect(
      provider.readDocument({ model: "gpt-4o", apiKey: "sk", fileName: "a.pdf", mimeType: "application/pdf", fileBase64: "" }),
    ).rejects.toThrow(/text/);
  });

  it("chat: 시스템 지시를 맨 앞에 두고 대화를 보내, 모델 컨텐츠 문자열을 그대로 반환", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '{"reply":"안녕하세요","actions":[]}' } }] }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    const provider = new OpenAiProvider();
    const { content } = await provider.chat({
      model: "gpt-4o-mini",
      apiKey: "sk-test",
      system: "비서 규칙",
      messages: [{ role: "user", content: "할 일 알려줘" }],
    });
    expect(content).toBe('{"reply":"안녕하세요","actions":[]}');
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.messages).toEqual([
      { role: "system", content: "비서 규칙" },
      { role: "user", content: "할 일 알려줘" },
    ]);
    expect(body.response_format).toEqual({ type: "json_object" });
  });

  it("chat: 401 응답이면 인증 실패 에러를 던진다", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401, text: async () => "invalid api key" }) as unknown as typeof fetch;
    const provider = new OpenAiProvider();
    await expect(
      provider.chat({ model: "gpt-4o-mini", apiKey: "sk-bad", system: "s", messages: [{ role: "user", content: "hi" }] }),
    ).rejects.toThrow(/401|인증/);
  });
});
