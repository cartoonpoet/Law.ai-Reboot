/**
 * DOCX 본문에서 plain text 추출 (mammoth.extractRawText).
 *
 * 표/리스트 구조는 평문화되지만 diff 비교 용도로는 충분. 서식 비교가 필요해지면
 * 별도 변환 경로(mammoth.convertToHtml + DOM walk) 도입.
 */
export const extractDocx = async (url: string): Promise<string> => {
  const [mammothMod, res] = await Promise.all([import("mammoth"), fetch(url)]);
  if (!res.ok) throw new Error(`R2 fetch ${res.status}`);
  const buffer = await res.arrayBuffer();
  const { value } = await mammothMod.extractRawText({ arrayBuffer: buffer });
  return value;
};
