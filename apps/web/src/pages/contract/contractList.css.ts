import { style } from "@vanilla-extract/css";
import { themeVars } from "@lawkit/ui";

const c = themeVars.color;

// 목록 상단 필터 드롭다운 폭.
export const filterSelect = style({ width: 150 });

// 만료 필터 드롭다운 폭(당사자/분류보다 좁다 — "180일 이내" 기준).
export const expirySelect = style({ width: 128 });

// 체결일 컬럼 셀 — 수정일(updated) 컬럼과 동일한 스타일을 따른다(시안 정합).
export const dateCell = style({
  fontSize: 12,
  color: c.textMuted,
  fontVariantNumeric: "tabular-nums",
});

// 체결일이 없는 행("-") — 실제 정보(미체결)를 전달하므로 textDisabled(초저대비) 대신
// textMuted 를 쓴다. textDisabled 는 진짜 비활성 요소용으로 남겨둔다.
export const emptyCell = style({
  fontSize: 12,
  color: c.textMuted,
  fontVariantNumeric: "tabular-nums",
});

// 1단(그룹) 세그먼트 컨트롤 + 총 건수 행.
export const groupBar = style({
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "11px 14px",
  borderBottom: `1px solid ${c.neutralBorder}`,
  flexWrap: "wrap",
});

export const groupBarSpacer = style({ flex: 1 });

export const totalCount = style({
  fontSize: 12.5,
  color: c.textMuted,
});

export const totalCountValue = style({
  color: c.textHeading,
  fontVariantNumeric: "tabular-nums",
});

// 2단(세부 상태) — 그룹 선택 시에만 렌더.
export const subbar = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "9px 14px",
  borderBottom: `1px solid ${c.neutralBorder}`,
  backgroundColor: c.neutralSurfaceAlt,
  flexWrap: "wrap",
});

// 테이블 래퍼 — 기존 인라인 padding:6 을 마이그레이션(이 편집에서 걷어낸 문제 있는 줄).
export const tableWrap = style({ padding: 6 });

export const subbarLabel = style({
  fontSize: 11,
  fontWeight: 700,
  // 읽어야 하는 라벨이라 textDisabled(초저대비) 대신 textMuted 사용.
  color: c.textMuted,
  letterSpacing: "0.02em",
  flexShrink: 0,
});
