import * as s from "./RichTextEditor.css";

/**
 * 서식 툴바 아이콘 — lawkit Icon 세트에 bold/underline/align/highlight 등 서식 아이콘이 없어
 * 시안(content-editor-mockup.html)의 인라인 SVG를 프레젠테이션 컴포넌트로 분리한다(SRP).
 * stroke/fill 색은 currentColor로 버튼 색을 상속하고, 크기는 className(css)으로 지정한다(인라인 style 금지).
 */
const ICON_PROPS = {
  className: s.icon,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export const IconHighlight = () => (
  <svg {...ICON_PROPS}>
    <path d="M12 19l7-7 3 3-7 7-3-3z" />
    <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18z" />
    <path d="M2 2l7.586 7.586" />
  </svg>
);

export const IconBulletList = () => (
  <svg {...ICON_PROPS}>
    <line x1="9" y1="6" x2="20" y2="6" />
    <line x1="9" y1="12" x2="20" y2="12" />
    <line x1="9" y1="18" x2="20" y2="18" />
    <circle className={s.iconFill} cx="4" cy="6" r="1.4" />
    <circle className={s.iconFill} cx="4" cy="12" r="1.4" />
    <circle className={s.iconFill} cx="4" cy="18" r="1.4" />
  </svg>
);

export const IconOrderedList = () => (
  <svg {...ICON_PROPS}>
    <line x1="10" y1="6" x2="20" y2="6" />
    <line x1="10" y1="12" x2="20" y2="12" />
    <line x1="10" y1="18" x2="20" y2="18" />
    <path d="M4 5h1v3M3 12h2l-2 3h2" strokeWidth={1.6} />
  </svg>
);

export const IconOutdent = () => (
  <svg {...ICON_PROPS}>
    <line x1="21" y1="6" x2="9" y2="6" />
    <line x1="21" y1="12" x2="11" y2="12" />
    <line x1="21" y1="18" x2="9" y2="18" />
    <polyline points="7 8 3 12 7 16" />
  </svg>
);

export const IconIndent = () => (
  <svg {...ICON_PROPS}>
    <line x1="3" y1="6" x2="15" y2="6" />
    <line x1="3" y1="12" x2="13" y2="12" />
    <line x1="3" y1="18" x2="15" y2="18" />
    <polyline points="17 8 21 12 17 16" />
  </svg>
);

export const IconAlignLeft = () => (
  <svg {...ICON_PROPS}>
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="15" y2="12" />
    <line x1="3" y1="18" x2="18" y2="18" />
  </svg>
);

export const IconAlignCenter = () => (
  <svg {...ICON_PROPS}>
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="7" y1="12" x2="17" y2="12" />
    <line x1="5" y1="18" x2="19" y2="18" />
  </svg>
);

export const IconAlignRight = () => (
  <svg {...ICON_PROPS}>
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="9" y1="12" x2="21" y2="12" />
    <line x1="6" y1="18" x2="21" y2="18" />
  </svg>
);

export const IconLink = () => (
  <svg {...ICON_PROPS}>
    <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
    <path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
  </svg>
);

export const IconDivider = () => (
  <svg {...ICON_PROPS}>
    <line x1="3" y1="12" x2="21" y2="12" />
  </svg>
);

export const IconClearFormat = () => (
  <svg {...ICON_PROPS}>
    <path d="M4 7V4h16v3" />
    <path d="M5 20h6" />
    <path d="M13 4L8 20" />
    <line x1="15" y1="15" x2="21" y2="21" />
    <line x1="21" y1="15" x2="15" y2="21" />
  </svg>
);

export const IconCaret = () => (
  <svg {...ICON_PROPS} className={s.caret}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

export const IconPaste = () => (
  <svg {...ICON_PROPS} className={s.hintIcon}>
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1" />
  </svg>
);

/* 인용/Blockquote — 시안 컴팩트 툴바의 quote 버튼. */
export const IconQuote = () => (
  <svg {...ICON_PROPS}>
    <path d="M7 7H4a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h2v2a2 2 0 0 1-2 2" />
    <path d="M17 7h-3a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h2v2a2 2 0 0 1-2 2" />
  </svg>
);

/* 파일 첨부 — 클립 아이콘. P2 시점에는 disabled로만 노출(P3에서 활성). */
export const IconAttach = () => (
  <svg {...ICON_PROPS}>
    <path d="M21.44 11.05l-9.19 9.19a5 5 0 0 1-7.07-7.07l9.19-9.19a3 3 0 0 1 4.24 4.24l-9.2 9.19a1 1 0 0 1-1.41-1.41l8.49-8.49" />
  </svg>
);

/* 파일 아이콘 — 시안 .filechip ficon 안의 문서. */
export const IconFile = () => (
  <svg {...ICON_PROPS}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
  </svg>
);

/* X (닫기/제거) — 시안 .frm. */
export const IconClose = () => (
  <svg {...ICON_PROPS}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

/* 드래그&드롭 힌트 클립 — 시안 .ed-dndhint. IconAttach 와 형태 동일하나 의미 분리. */
export const IconDnd = () => (
  <svg {...ICON_PROPS}>
    <path d="M21.44 11.05l-9.19 9.19a5 5 0 0 1-7.07-7.07l9.19-9.19a3 3 0 0 1 4.24 4.24l-9.2 9.19a1 1 0 0 1-1.41-1.41l8.49-8.49" />
  </svg>
);

/* 전송(등록) 버튼 아이콘 — 시안 종이비행기. */
export const IconSend = () => (
  <svg {...ICON_PROPS}>
    <path d="M22 2L11 13" />
    <path d="M22 2l-7 20-4-9-9-4z" />
  </svg>
);

/* 양쪽 정렬 — 문서 편집기 풀 툴바(워드 리본)의 네 번째 정렬. */
export const IconAlignJustify = () => (
  <svg {...ICON_PROPS}>
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

/* 실행 취소 — 왼쪽으로 도는 화살표. */
export const IconUndo = () => (
  <svg {...ICON_PROPS}>
    <polyline points="9 14 4 9 9 4" />
    <path d="M4 9h9a7 7 0 0 1 0 14h-3" />
  </svg>
);

/* 다시 실행 — 오른쪽으로 도는 화살표. */
export const IconRedo = () => (
  <svg {...ICON_PROPS}>
    <polyline points="15 14 20 9 15 4" />
    <path d="M20 9h-9a7 7 0 0 0 0 14h3" />
  </svg>
);

/* 찾기·바꾸기 — 돋보기. */
export const IconFind = () => (
  <svg {...ICON_PROPS}>
    <circle cx="11" cy="11" r="7" />
    <line x1="16.5" y1="16.5" x2="21" y2="21" />
  </svg>
);

/* 이미지 넣기 — 사진(로고·인감). */
export const IconImage = () => (
  <svg {...ICON_PROPS}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <circle cx="8.5" cy="9.5" r="1.5" />
    <polyline points="21 16 16 11 5 20" />
  </svg>
);

/* 페이지 나누기 — 점선 경계 위아래의 종이. */
export const IconPageBreak = () => (
  <svg {...ICON_PROPS}>
    <path d="M6.5 9V4h11v5" />
    <path d="M6.5 15v5h11v-5" />
    <line x1="2.5" y1="12" x2="21.5" y2="12" strokeDasharray="3 2.5" />
  </svg>
);

/* 줄 간격 — 위아래 화살표 + 글줄. */
export const IconLineHeight = () => (
  <svg {...ICON_PROPS}>
    <polyline points="3 7 5.5 4 8 7" />
    <polyline points="3 17 5.5 20 8 17" />
    <line x1="5.5" y1="4" x2="5.5" y2="20" />
    <line x1="12" y1="6" x2="21" y2="6" />
    <line x1="12" y1="12" x2="21" y2="12" />
    <line x1="12" y1="18" x2="21" y2="18" />
  </svg>
);

/* 표 — 문서 편집기 툴바의 "표 삽입". 3x3 격자(머리행 구분). */
export const IconTable = () => (
  <svg {...ICON_PROPS}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="3" y1="14.5" x2="21" y2="14.5" />
    <line x1="9" y1="9" x2="9" y2="20" />
    <line x1="15" y1="9" x2="15" y2="20" />
  </svg>
);
