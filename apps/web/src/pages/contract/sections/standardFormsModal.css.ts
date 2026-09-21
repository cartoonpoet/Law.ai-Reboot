import { style } from "@vanilla-extract/css";
import { themeVars } from "@lawkit/ui";

/* 표준계약서 양식 보기 모달 — 3분할(분류 | 목록 | 미리보기). 색/보더는 themeVars. */
export const grid3 = style({
  display: "grid",
  gridTemplateColumns: "176px 1fr 286px",
  // 미리보기 칸(양식명 + 문서 + 메타 + 안내 문구)이 잘리지 않는 높이.
  height: 460,
  border: `1px solid ${themeVars.color.neutralBorder}`,
  borderRadius: 10,
  overflow: "hidden",
});

export const colCats = style({
  background: themeVars.color.neutralSurfaceAlt,
  borderRight: `1px solid ${themeVars.color.neutralBorder}`,
  padding: 8,
  overflowY: "auto",
});
export const catsHead = style({ padding: "6px 8px", fontSize: 11, fontWeight: 600, letterSpacing: "0.02em", color: themeVars.color.textMuted });

export const colMid = style({ display: "flex", flexDirection: "column", minWidth: 0, borderRight: `1px solid ${themeVars.color.neutralBorder}` });
export const colList = style({ flex: 1, minHeight: 0, overflowY: "auto", padding: 8 });
export const searchBar = style({ padding: "10px 12px", borderBottom: `1px solid ${themeVars.color.neutralBorder}` });

/** 목록 자리의 불러오는 중·없음·실패 — 빈 칸을 두지 않고 가운데에 보여준다. */
export const listState = style({
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "16px 12px",
});

export const colPrev = style({
  display: "flex",
  flexDirection: "column",
  gap: 12,
  background: themeVars.color.neutralSurfaceAlt,
  padding: 14,
  overflowY: "auto",
});
export const prevName = style({ fontSize: 13.5, fontWeight: 600, letterSpacing: "-0.01em", color: themeVars.color.textHeading, lineHeight: 1.4 });

/** 고른 양식이 없을 때 — 가짜 문서 대신 안내만 가운데에 둔다. */
export const prevEmpty = style({ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" });

/* 문서 미리보기 — 문서 페이지처럼 보이는 placeholder */
export const prevPage = style({
  display: "flex",
  flexDirection: "column",
  gap: 7,
  background: themeVars.color.neutralSurface,
  border: `1px solid ${themeVars.color.neutralBorder}`,
  borderRadius: 8,
  boxShadow: "0 1px 3px rgba(16, 24, 40, 0.06)",
  padding: "18px 16px",
});
export const prevPageTitle = style({ fontSize: 12.5, fontWeight: 700, letterSpacing: "-0.01em", color: themeVars.color.textHeading, textAlign: "center" });
export const prevPageSub = style({ fontSize: 9.5, fontWeight: 600, letterSpacing: "0.04em", color: themeVars.color.textMuted, textAlign: "center", marginBottom: 8 });
export const line = style({ height: 7, borderRadius: 3, background: themeVars.color.neutralSurfaceAlt });
export const lineSm = style({ width: "52%" });
export const lineMd = style({ width: "84%" });
export const clauseLine = style({
  height: 8,
  width: "38%",
  borderRadius: 3,
  marginTop: 9,
  background: `color-mix(in srgb, ${themeVars.color.accentPrimary} 22%, ${themeVars.color.neutralSurface})`,
});

/* 양식 목록 행 텍스트 */
export const docName = style({ fontSize: 13, fontWeight: 600, letterSpacing: "-0.01em", color: themeVars.color.textHeading });
export const ver = style({ fontSize: 10.5, fontWeight: 600, color: themeVars.color.accentPrimary });
export const tplDesc = style({ fontSize: 11.5, color: themeVars.color.textMuted, lineHeight: 1.5 });
export const tplMeta = style({ fontSize: 11, color: themeVars.color.textMuted });

/** 분류 목록 오른쪽 개수 — 고른 줄은 바탕이 진해지므로 글자색을 그 줄에서 물려받는다. */
export const catCount = style({ fontSize: 11, color: "currentColor", opacity: 0.72 });

/* 미리보기 메타 */
export const kv = style({ display: "flex", fontSize: 11.5, padding: "5px 0", borderBottom: `1px dashed ${themeVars.color.neutralBorder}` });
export const kvK = style({ width: 58, flexShrink: 0, color: themeVars.color.textMuted, fontWeight: 600 });
export const kvV = style({ color: themeVars.color.textHeading, fontWeight: 500 });

/** 미리보기 아래 한 줄 안내 — 시안(StartFromFormMock)의 startHint 와 같은 크기·색. */
export const prevHint = style({
  display: "flex",
  gap: 6,
  margin: 0,
  fontSize: 11.5,
  lineHeight: 1.6,
  color: themeVars.color.textMuted,
});
export const prevHintIcon = style({ width: 14, height: 14, flexShrink: 0, marginTop: 2 });

/** 계약서 작성 편집기가 뜨기 전(불러오는 중·실패) 자리 — 편집기와 비슷한 높이를 미리 잡아 모달이 튀지 않게 한다. */
export const editorState = style({
  minHeight: 420,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
});

/* 푸터 */
export const footRow = style({ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", gap: 8 });
export const footInfo = style({ fontSize: 12.5, fontWeight: 500, color: themeVars.color.textSecondary });
export const footStrong = style({ fontWeight: 700, color: themeVars.color.accentPrimary });
export const footBtns = style({ display: "flex", gap: 8 });

export const checkMark = style({ display: "inline-flex", color: themeVars.color.accentPrimary });
