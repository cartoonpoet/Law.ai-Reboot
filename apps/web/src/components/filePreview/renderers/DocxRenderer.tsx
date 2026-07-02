import { useQuery } from "@tanstack/react-query";
import DOMPurify from "dompurify";
import { useFilePreviewUrl } from "../useFilePreviewUrl";
import * as css from "../filePreview.css";

interface DocxRendererProps {
  fileId: string;
}

// mammoth 는 번들 크기가 커서 dynamic import + react-query 로 결과 캐싱.
// package.json#browser 가 unzip 등을 브라우저용으로 자동 치환해 vite 에서 그대로 동작.
const convertDocxToHtml = async (url: string): Promise<string> => {
  const [mammothMod, res] = await Promise.all([import("mammoth"), fetch(url)]);
  if (!res.ok) throw new Error(`R2 fetch ${res.status}`);
  const buffer = await res.arrayBuffer();
  const { value } = await mammothMod.convertToHtml({ arrayBuffer: buffer });
  // DOCX → HTML 결과는 mammoth 내부 화이트리스트지만 추가 sanitize 로 한 번 더 거른다.
  return DOMPurify.sanitize(value, { USE_PROFILES: { html: true } });
};

/**
 * DOCX 미리보기 — fetch → mammoth(browser) → sanitize → inline HTML.
 *
 * 한글 폰트 이슈: mammoth 가 inline style 로 font-family 를 박는데 시스템 폰트
 * 없으면 깨질 수 있어, css.docxBody 의 기본 폰트(브라우저 기본 sans-serif)
 * 가 적용되도록 globalStyle 로 표/리스트 마진만 잡고 폰트는 강제하지 않는다.
 */
export function DocxRenderer({ fileId }: DocxRendererProps) {
  const presigned = useFilePreviewUrl(fileId);
  const html = useQuery({
    queryKey: ["docx-html", fileId, presigned.data?.url],
    queryFn: () => convertDocxToHtml(presigned.data!.url),
    enabled: Boolean(presigned.data?.url),
    staleTime: 5 * 60 * 1000,
  });

  if (presigned.isLoading)
    return <div className={css.placeholder}>DOCX URL 발급 중…</div>;
  if (presigned.error)
    return (
      <div className={css.placeholder}>
        DOCX 를 불러올 수 없습니다 (URL 발급 실패).
      </div>
    );

  if (html.isLoading)
    return <div className={css.placeholder}>DOCX 본문 파싱 중…</div>;
  if (html.error || !html.data)
    return (
      <div className={css.placeholder}>
        DOCX 본문을 파싱하지 못했습니다. 다운로드해서 확인해 주세요.
      </div>
    );

  return (
    <div
      className={css.docxBody}
      dangerouslySetInnerHTML={{ __html: html.data }}
    />
  );
}
