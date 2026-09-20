import type { DropdownOption } from "@lawkit/ui";

/** 글꼴·글자크기·줄간격 드롭다운에서 "지정 안 함"을 뜻하는 값. */
export const DEFAULT_OPTION_VALUE = "__default__";

/**
 * 계약서에 흔히 쓰는 글꼴 목록. value 는 문서 HTML 에 그대로 적히는 font-family 값이라
 * 토큰이 아니라 구체 서체 이름이 맞다(저장되는 데이터 값).
 */
export const FONT_FAMILIES: DropdownOption[] = [
  { value: DEFAULT_OPTION_VALUE, label: "기본 글꼴" },
  { value: "'Malgun Gothic', '맑은 고딕', sans-serif", label: "맑은 고딕" },
  { value: "Batang, '바탕', serif", label: "바탕" },
  { value: "Dotum, '돋움', sans-serif", label: "돋움" },
  { value: "Gulim, '굴림', sans-serif", label: "굴림" },
  { value: "'Nanum Gothic', '나눔고딕', sans-serif", label: "나눔고딕" },
  { value: "'Nanum Myeongjo', '나눔명조', serif", label: "나눔명조" },
  { value: "'HCR Batang', '함초롬바탕', serif", label: "함초롬바탕" },
  { value: "'Times New Roman', serif", label: "Times New Roman" },
  { value: "Arial, sans-serif", label: "Arial" },
];

/** 글자 크기 — 워드와 같은 pt 단위. */
export const FONT_SIZES: DropdownOption[] = [
  { value: DEFAULT_OPTION_VALUE, label: "기본" },
  ...[9, 10, 11, 12, 14, 16, 18, 20, 24].map((pt) => ({ value: `${pt}pt`, label: `${pt}` })),
];

/** 줄 간격 — 워드의 1.0 / 1.15 / 1.5 / 2.0. */
export const LINE_HEIGHTS: DropdownOption[] = [
  { value: DEFAULT_OPTION_VALUE, label: "기본" },
  { value: "1", label: "1.0" },
  { value: "1.15", label: "1.15" },
  { value: "1.5", label: "1.5" },
  { value: "2", label: "2.0" },
];

/** 문단 스타일 — 본문/제목1~3. value 는 heading 레벨 또는 본문. */
export const PARAGRAPH_STYLE_VALUE = "p";

export const BLOCK_STYLE_OPTIONS: DropdownOption[] = [
  { value: PARAGRAPH_STYLE_VALUE, label: "본문" },
  { value: "1", label: "제목 1" },
  { value: "2", label: "제목 2" },
  { value: "3", label: "제목 3" },
];
