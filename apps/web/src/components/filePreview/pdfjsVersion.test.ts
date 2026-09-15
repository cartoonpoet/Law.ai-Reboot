import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";

// PdfRenderer 는 react-pdf 의 pdf.js(API)를 쓰고, 워커 파일은 앱의 pdfjs-dist 에서 가져온다.
// 두 버전이 다르면 pdf.js 가 "API version does not match Worker version" 으로 모든 PDF 열기를 거부한다
// (dev 에서 "PDF 를 열 수 없습니다"로 실제 발생). 버전이 어긋나면 여기서 먼저 깨지게 한다.
const require = createRequire(import.meta.url);

const readVersion = (packageJsonPath: string) => (JSON.parse(readFileSync(packageJsonPath, "utf8")) as { version: string }).version;

describe("pdf.js 버전 일치", () => {
  it("앱의 pdfjs-dist 와 react-pdf 가 쓰는 pdfjs-dist 버전이 같다", () => {
    const appPdfjs = readVersion(require.resolve("pdfjs-dist/package.json"));
    const reactPdfDir = dirname(require.resolve("react-pdf"));
    const reactPdfPdfjs = readVersion(require.resolve("pdfjs-dist/package.json", { paths: [join(reactPdfDir, "..")] }));
    expect(appPdfjs).toBe(reactPdfPdfjs);
  });
});
