import { readFileSync } from "fs";
import { join } from "path";
import { ContractTextExtractor } from "./contract-text.extractor";
import type { R2Client } from "../files/r2.client";

// 실제 라이브러리(pdf.js·mammoth)로 한글 계약서를 읽는지 확인 — 한글 PDF 는 문자 대응표(cmaps)가
// 없으면 글자가 사라지므로(예전 pdf-parse 에서 실제로 발생) 파일로 직접 검증한다.
const fixture = (name: string) => new Uint8Array(readFileSync(join(__dirname, "__fixtures__", name)));

const createExtractor = (bytes: Uint8Array) =>
  new ContractTextExtractor({ getObjectBytes: jest.fn().mockResolvedValue(bytes) } as unknown as R2Client);

describe("ContractTextExtractor (실제 파일)", () => {
  it("한글 PDF 계약서의 조항 글자를 그대로 뽑는다", async () => {
    const text = await createExtractor(fixture("contract-ko.pdf")).extract([
      { role: "contract", name: "contract-ko.pdf", mimeType: "application/pdf", storageKey: "k" },
    ]);
    expect(text).toContain("제5조 (손해배상) 을의 손해배상 한도는 계약금액의 300%로 한다.");
  });

  it("한글 워드(docx) 계약서의 조항 글자를 그대로 뽑는다", async () => {
    const text = await createExtractor(fixture("contract-ko.docx")).extract([
      {
        role: "contract",
        name: "contract-ko.docx",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        storageKey: "k",
      },
    ]);
    expect(text).toContain("제1조 (목적) 본 계약은 갑과 을 사이의 EV 충전기 공급에 관한 사항을 정한다.");
  });
});
