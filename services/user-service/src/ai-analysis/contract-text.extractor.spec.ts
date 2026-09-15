import * as mammoth from "mammoth";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.js";
import { ContractTextExtractor, MAX_CONTRACT_TEXT_LENGTH, SCANNED_TEXT_NOTE } from "./contract-text.extractor";
import type { ScannedPdfReader } from "./scanned-pdf.reader";
import type { R2Client } from "../files/r2.client";

jest.mock("mammoth", () => ({ extractRawText: jest.fn() }));
jest.mock("pdfjs-dist/legacy/build/pdf.js", () => ({ getDocument: jest.fn() }));

// pdfjs 문서 흉내 — 쪽마다 글자 조각(items)을 돌려준다.
const mockPdfPages = (pages: string[][]) =>
  jest.mocked(pdfjs.getDocument).mockReturnValue({
    promise: Promise.resolve({
      numPages: pages.length,
      getPage: async (n: number) => ({
        getTextContent: async () => ({ items: pages[n - 1].map((str) => ({ str, hasEOL: true })) }),
      }),
      destroy: async () => undefined,
    }),
  } as never);

const pdfFile = { role: "contract", name: "공급계약서.pdf", mimeType: "application/pdf", storageKey: "k-pdf" };
const docxFile = {
  role: "contract",
  name: "용역계약서.docx",
  mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  storageKey: "k-docx",
};

describe("ContractTextExtractor", () => {
  let r2: { getObjectBytes: jest.Mock };
  let scannedPdf: { read: jest.Mock };
  let extractor: ContractTextExtractor;

  beforeEach(() => {
    r2 = { getObjectBytes: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3])) };
    scannedPdf = { read: jest.fn().mockResolvedValue(null) };
    extractor = new ContractTextExtractor(r2 as unknown as R2Client, scannedPdf as unknown as ScannedPdfReader);
    jest.mocked(pdfjs.getDocument).mockReset();
    jest.mocked(mammoth.extractRawText).mockReset();
  });

  it("PDF·워드 계약서 원본에서 본문을 뽑아 파일 이름과 함께 합친다", async () => {
    mockPdfPages([["제1조 (목적)", "본 계약은   공급에 관한 것이다."]]);
    jest.mocked(mammoth.extractRawText).mockResolvedValue({ value: "제5조 손해배상", messages: [] } as never);
    const text = await extractor.extract([pdfFile, docxFile]);
    expect(text).toBe("[파일: 공급계약서.pdf]\n제1조 (목적)\n본 계약은 공급에 관한 것이다.\n\n[파일: 용역계약서.docx]\n제5조 손해배상");
    expect(r2.getObjectBytes).toHaveBeenCalledWith("k-pdf");
  });

  it("계약서 원본이 아니거나, 업로드 안 됐거나, 못 읽는 형식(구형 워드 doc)은 건너뛴다", async () => {
    const text = await extractor.extract([
      { ...pdfFile, role: "attach" },
      { ...pdfFile, storageKey: null },
      { role: "contract", name: "계약서.doc", mimeType: "application/msword", storageKey: "k-doc" },
    ]);
    expect(text).toBeNull();
    expect(r2.getObjectBytes).not.toHaveBeenCalled();
  });

  it("파일 하나가 실패해도 나머지는 읽는다", async () => {
    jest.mocked(pdfjs.getDocument).mockReturnValue({ promise: Promise.reject(new Error("깨진 PDF")) } as never);
    jest.mocked(mammoth.extractRawText).mockResolvedValue({ value: "제5조 손해배상", messages: [] } as never);
    expect(await extractor.extract([pdfFile, docxFile])).toBe("[파일: 용역계약서.docx]\n제5조 손해배상");
  });

  it("파일 저장소가 꺼져 있으면(null) 본문 없음", async () => {
    r2.getObjectBytes.mockResolvedValue(null);
    expect(await extractor.extract([pdfFile])).toBeNull();
  });

  it("글자가 없는 PDF(스캔)도 AI 연동 주인(ocrUserId)을 모르면 AI 로 읽지 않고 본문 없음", async () => {
    mockPdfPages([[]]);
    expect(await extractor.extract([pdfFile])).toBeNull();
    expect(scannedPdf.read).not.toHaveBeenCalled();
  });

  it("글자가 없는 PDF(스캔)는 분석을 요청한 사람의 AI 연동으로 읽고, AI 가 읽은 글자라고 표시한다", async () => {
    mockPdfPages([[], []]);
    scannedPdf.read.mockResolvedValue("제1조 (목적)   스캔 본문");

    const text = await extractor.extract([pdfFile], { ocrUserId: "u1" });

    expect(scannedPdf.read).toHaveBeenCalledWith({
      userId: "u1",
      storageKey: "k-pdf",
      fileName: "공급계약서.pdf",
      bytes: new Uint8Array([1, 2, 3]),
      pageCount: 2,
    });
    expect(text).toBe(`[파일: 공급계약서.pdf]\n${SCANNED_TEXT_NOTE}\n제1조 (목적) 스캔 본문`);
  });

  it("AI 로도 못 읽으면(연동 없음·제한 초과·빈 결과) 본문 없음", async () => {
    mockPdfPages([[]]);
    scannedPdf.read.mockResolvedValue(null);
    expect(await extractor.extract([pdfFile], { ocrUserId: "u1" })).toBeNull();
  });

  it("AI 읽기가 실패해도 다른 파일은 읽는다", async () => {
    mockPdfPages([[]]);
    scannedPdf.read.mockRejectedValue(new Error("OpenAI 레이트리밋(429)"));
    jest.mocked(mammoth.extractRawText).mockResolvedValue({ value: "제5조 손해배상", messages: [] } as never);
    expect(await extractor.extract([pdfFile, docxFile], { ocrUserId: "u1" })).toBe("[파일: 용역계약서.docx]\n제5조 손해배상");
  });

  it("글자 층이 있는 PDF 는 AI 로 읽지 않는다(비용 없음)", async () => {
    mockPdfPages([["제1조 (목적)"]]);
    expect(await extractor.extract([pdfFile], { ocrUserId: "u1" })).toBe("[파일: 공급계약서.pdf]\n제1조 (목적)");
    expect(scannedPdf.read).not.toHaveBeenCalled();
  });

  it("너무 긴 본문은 앞부분만 남기고 생략 표시", async () => {
    mockPdfPages([["가".repeat(MAX_CONTRACT_TEXT_LENGTH + 500)]]);
    const text = await extractor.extract([pdfFile]);
    expect(text?.length).toBeLessThan(MAX_CONTRACT_TEXT_LENGTH + 100);
    expect(text?.endsWith("앞부분만 분석)")).toBe(true);
  });
});
