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
