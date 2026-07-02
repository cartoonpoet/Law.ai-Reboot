import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import type { TextItem } from "pdfjs-dist/types/src/display/api";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

// PdfRenderer 도 동일 워커 — GlobalWorkerOptions 는 1회만 잡으면 됨.
if (!GlobalWorkerOptions.workerSrc) {
  GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
}

const isTextItem = (it: unknown): it is TextItem =>
  typeof (it as TextItem)?.str === "string";

/**
 * PDF 페이지 별 텍스트를 추출해 \n\n 으로 연결한다.
 *
 * - pdfjs `getTextContent()` 의 items 는 줄/단어 단위 fragment 라 그대로 join 하면 줄바꿈이 망가짐.
 *   각 페이지 안에서는 공백으로 잇고, 페이지 사이는 빈 줄(\n\n) 로 구분 — diff 출력의 가독성 우선.
 * - 스캔 PDF(이미지) 는 텍스트가 빈 결과 — 호출자가 빈 문자열 fallback 처리.
 */
export const extractPdf = async (url: string): Promise<string> => {
  const doc = await getDocument({ url }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .filter(isTextItem)
      .map((it) => it.str)
      .join(" ");
    pages.push(text.trim());
  }
  return pages.join("\n\n");
};
