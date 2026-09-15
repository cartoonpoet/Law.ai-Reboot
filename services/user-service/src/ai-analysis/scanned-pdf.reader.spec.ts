import { MAX_OCR_FILE_BYTES, MAX_OCR_PAGES, ScannedPdfReader } from "./scanned-pdf.reader";

describe("ScannedPdfReader", () => {
  const credentials = { getDecryptedKeyFor: jest.fn() };
  const aiClient = { readDocument: jest.fn() };
  let reader: ScannedPdfReader;
  const bytes = new Uint8Array([37, 80, 68, 70]); // "%PDF"
  const request = (over: Partial<Parameters<ScannedPdfReader["read"]>[0]> = {}) => ({
    userId: "u1",
    storageKey: "contracts/t1/ct-1/scan.pdf",
    fileName: "계약서.pdf",
    bytes,
    pageCount: 3,
    ...over,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    reader = new ScannedPdfReader(credentials as never, aiClient as never);
    credentials.getDecryptedKeyFor.mockResolvedValue({ provider: "openai", model: "gpt-4o", apiKey: "sk-user" });
  });

  it("분석을 요청한 사람의 모델·키로 PDF 를 base64 로 보내 읽은 글자를 돌려준다", async () => {
    aiClient.readDocument.mockResolvedValue({ text: "  제1조 (목적) 스캔 본문\n" });

    const text = await reader.read(request());

    expect(credentials.getDecryptedKeyFor).toHaveBeenCalledWith("u1");
    expect(aiClient.readDocument).toHaveBeenCalledWith({
      model: "gpt-4o",
      apiKey: "sk-user",
      fileName: "계약서.pdf",
      mimeType: "application/pdf",
      fileBase64: "JVBERg==",
    });
    expect(text).toBe("제1조 (목적) 스캔 본문");
  });

  it("같은 파일을 동시에·연달아 읽어도 AI 는 한 번만 부른다(사전 점검·리스크 분석 중복 비용 방지)", async () => {
    aiClient.readDocument.mockResolvedValue({ text: "스캔 본문" });

    const [first, second] = await Promise.all([reader.read(request()), reader.read(request())]);
    const third = await reader.read(request({ userId: "u2" }));

    expect([first, second, third]).toEqual(["스캔 본문", "스캔 본문", "스캔 본문"]);
    expect(aiClient.readDocument).toHaveBeenCalledTimes(1);
  });

  it("실패한 읽기는 기억하지 않아 다음 요청에서 다시 시도한다", async () => {
    aiClient.readDocument.mockRejectedValueOnce(new Error("OpenAI 레이트리밋(429)"));
    await expect(reader.read(request())).rejects.toThrow("429");

    aiClient.readDocument.mockResolvedValue({ text: "스캔 본문" });
    await expect(reader.read(request())).resolves.toBe("스캔 본문");
    expect(aiClient.readDocument).toHaveBeenCalledTimes(2);
  });

  it("AI 연동이 없으면 읽지 않고 null — 기억하지 않아 연동 있는 사람이 요청하면 읽는다", async () => {
    credentials.getDecryptedKeyFor.mockResolvedValueOnce(null);
    expect(await reader.read(request())).toBeNull();
    expect(aiClient.readDocument).not.toHaveBeenCalled();

    aiClient.readDocument.mockResolvedValue({ text: "스캔 본문" });
    expect(await reader.read(request({ userId: "u2" }))).toBe("스캔 본문");
  });

  it("쪽수나 크기가 제한을 넘으면 연동 조회도 하지 않고 null", async () => {
    expect(await reader.read(request({ pageCount: MAX_OCR_PAGES + 1 }))).toBeNull();
    expect(await reader.read(request({ bytes: new Uint8Array(MAX_OCR_FILE_BYTES + 1), pageCount: 1 }))).toBeNull();
    expect(credentials.getDecryptedKeyFor).not.toHaveBeenCalled();
  });

  it("읽은 글자가 비었으면 null", async () => {
    aiClient.readDocument.mockResolvedValue({ text: "   " });
    expect(await reader.read(request())).toBeNull();
  });
});
