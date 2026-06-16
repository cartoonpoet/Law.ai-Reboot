import { describe, it, expect } from "vitest";
import { formatFileMeta } from "./fileMeta";

const makeFile = (name: string, size: number): File =>
  new File([new Uint8Array(size)], name);

describe("formatFileMeta", () => {
  it("확장자를 대문자로, 용량을 MB로 표기한다", () => {
    expect(formatFileMeta(makeFile("계약서.docx", 1.2 * 1024 * 1024))).toBe("DOCX · 1.2MB");
  });

  it("1MB 미만은 KB로 표기한다", () => {
    expect(formatFileMeta(makeFile("note.pdf", 856 * 1024))).toBe("PDF · 856KB");
  });

  it("1KB 미만은 B로 표기한다", () => {
    expect(formatFileMeta(makeFile("tiny.txt", 512))).toBe("TXT · 512B");
  });

  it("확장자가 없으면 FILE로 표기한다", () => {
    expect(formatFileMeta(makeFile("README", 2048))).toBe("FILE · 2KB");
  });
});
