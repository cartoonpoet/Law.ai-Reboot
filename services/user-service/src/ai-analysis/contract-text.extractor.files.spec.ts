import { readFileSync } from "fs";
import { join } from "path";
import { deflateRawSync } from "zlib";
import * as CFB from "cfb";
import JSZip from "jszip";
import { ContractTextExtractor } from "./contract-text.extractor";
import { HWPTAG_PARA_TEXT } from "./hwp-text";
import type { ScannedPdfReader } from "./scanned-pdf.reader";
import type { R2Client } from "../files/r2.client";

// 실제 라이브러리(pdf.js·mammoth)로 한글 계약서를 읽는지 확인 — 한글 PDF 는 문자 대응표(cmaps)가
// 없으면 글자가 사라지므로(예전 pdf-parse 에서 실제로 발생) 파일로 직접 검증한다.
const fixture = (name: string) => new Uint8Array(readFileSync(join(__dirname, "__fixtures__", name)));

const createExtractor = (bytes: Uint8Array) =>
  new ContractTextExtractor(
    { getObjectBytes: jest.fn().mockResolvedValue(bytes) } as unknown as R2Client,
    { read: jest.fn().mockResolvedValue(null) } as unknown as ScannedPdfReader,
  );

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

  describe("한글 파일", () => {
    const HWP_HEADER_SIZE = 256;
    const HWP_COMPRESSED = 0x1;
    const HWP_DISTRIBUTION = 0x4;

    // 문단 글자 레코드 — 크기가 4095 이상이면 크기를 뒤 4바이트에 따로 적는다.
    const paraTextRecord = (body: Buffer) => {
      const isExtended = body.length >= 0xfff;
      const header = Buffer.alloc(isExtended ? 8 : 4);
      header.writeUInt32LE(HWPTAG_PARA_TEXT + (isExtended ? 0xfff : body.length) * 2 ** 20, 0);
      if (isExtended) header.writeUInt32LE(body.length, 4);
      return Buffer.concat([header, body]);
    };
    const paragraph = (text: string) => paraTextRecord(Buffer.from(`${text}\r`, "utf16le"));
    // 표(11)·탭(9) 같은 제어는 앞뒤에 같은 코드를 둔 8칸짜리로 저장된다.
    const control = (code: number) => {
      const chars = Buffer.alloc(16);
      chars.writeUInt16LE(code, 0);
      chars.writeUInt16LE(code, 14);
      return chars;
    };
    // 표 개체 자리 뒤에 "제2조<탭>(대금)" 이 오는 문단.
    const paragraphAfterTable = () =>
      paraTextRecord(
        Buffer.concat([control(11), Buffer.from("제2조", "utf16le"), control(9), Buffer.from("(대금)\r", "utf16le")]),
      );

    const createHwp = (properties: number, sections: Buffer[]) => {
      const header = Buffer.alloc(HWP_HEADER_SIZE);
      header.write("HWP Document File", 0, "latin1");
      header.writeUInt32LE(0x05010000, 32);
      header.writeUInt32LE(properties, 36);
      const container = CFB.utils.cfb_new();
      CFB.utils.cfb_add(container, "/FileHeader", header);
      sections.forEach((section, index) => {
        const data = properties & HWP_COMPRESSED ? deflateRawSync(section) : section;
        CFB.utils.cfb_add(container, `/BodyText/Section${index}`, data);
      });
      return new Uint8Array(CFB.write(container, { type: "buffer" }) as Buffer);
    };

    const hwpFile = { role: "contract", name: "공급계약서.hwp", mimeType: "application/x-hwp", storageKey: "k" };

    it("압축된 한글(hwp) 계약서의 여러 구역 조항 글자를 순서대로 뽑고, 표 자리는 건너뛴다", async () => {
      const bytes = createHwp(HWP_COMPRESSED, [
        Buffer.concat([paragraph("제1조 (목적) 본 계약은 공급에 관한 것이다."), paragraphAfterTable()]),
        paragraph("제5조 (손해배상) 을의 손해배상 한도는 계약금액의 300%로 한다."),
      ]);
      const text = await createExtractor(bytes).extract([hwpFile]);
      expect(text).toBe(
        "[파일: 공급계약서.hwp]\n제1조 (목적) 본 계약은 공급에 관한 것이다.\n제2조 (대금)\n제5조 (손해배상) 을의 손해배상 한도는 계약금액의 300%로 한다.",
      );
    });

    it("긴 문단(레코드 크기 확장)도 끝까지 읽는다", async () => {
      const longClause = `제9조 ${"가".repeat(3000)}`;
      const text = await createExtractor(createHwp(0, [paragraph(longClause)])).extract([hwpFile]);
      expect(text).toBe(`[파일: 공급계약서.hwp]\n${longClause}`);
    });

    it("배포용 한글 문서는 본문이 암호화돼 있어 본문 없음", async () => {
      const text = await createExtractor(createHwp(HWP_DISTRIBUTION, [paragraph("비밀")])).extract([hwpFile]);
      expect(text).toBeNull();
    });

    it("한글 개방형(hwpx) 계약서의 조항 글자를 구역 순서대로 뽑는다", async () => {
      const zip = new JSZip();
      const section = (body: string) =>
        `<?xml version="1.0" encoding="UTF-8"?><hs:sec xmlns:hs="s" xmlns:hp="p">${body}</hs:sec>`;
      zip.file("mimetype", "application/hwp+zip");
      zip.file(
        "Contents/section1.xml",
        section('<hp:p><hp:run><hp:t>제5조 (손해배상) 한도는 계약금액의 300%로 한다.</hp:t></hp:run></hp:p>'),
      );
      zip.file(
        "Contents/section0.xml",
        section(
          '<hp:p id="1"><hp:run><hp:t>제1조 (목적) 갑&amp;을의 </hp:t><hp:t>공급 계약</hp:t></hp:run></hp:p>' +
            "<hp:p><hp:run><hp:t>제2조<hp:tab/>(대금) &lt;별첨&gt;</hp:t></hp:run></hp:p>",
        ),
      );
      const bytes = await zip.generateAsync({ type: "uint8array" });
      const text = await createExtractor(bytes).extract([
        { role: "contract", name: "공급계약서.hwpx", mimeType: "application/vnd.hancom.hwpx", storageKey: "k" },
      ]);
      expect(text).toBe(
        "[파일: 공급계약서.hwpx]\n제1조 (목적) 갑&을의 공급 계약\n제2조 (대금) <별첨>\n\n제5조 (손해배상) 한도는 계약금액의 300%로 한다.",
      );
    });
  });
});
