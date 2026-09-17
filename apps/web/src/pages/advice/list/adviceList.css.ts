import { style, styleVariants } from "@vanilla-extract/css";
import { themeVars } from "@lawkit/ui";
import type { DdayToneTypes } from "../../dashboard/dday";

const c = themeVars.color;

export const filters = style({ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" });

export const search = style({ flex: 1, minWidth: 220, maxWidth: 360 });

export const searchIcon = style({ width: 15, height: 15, color: c.textDisabled });

export const pager = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "10px 16px 14px",
});

export const codeCell = style({ fontSize: 12, color: c.textMuted, fontWeight: 600, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" });

export const titleCell = style({ display: "flex", alignItems: "center", gap: 6 });

export const lockIcon = style({ width: 12, height: 12, color: c.accentWarning, flexShrink: 0 });

export const titleText = style({ fontSize: 13, fontWeight: 600, color: c.textHeading });

export const categoryCell = style({ display: "flex", flexWrap: "nowrap", gap: 4 });

export const dateText = style({ whiteSpace: "nowrap" });

export const bodyText = style({ fontSize: 12.5, color: c.textSecondary });

export const personName = style({ fontSize: 12.5, color: c.textSecondary, fontWeight: 600 });

export const personDept = style({ fontSize: 11.5, color: c.textMuted });

export const unassigned = style({ fontSize: 11.5, fontWeight: 700, color: c.accentWarningActive });

const ddayBase = style({ fontSize: 11.5, fontWeight: 800, fontVariantNumeric: "tabular-nums" });

const DDAY_COLORS: Record<DdayToneTypes, string> = {
  danger: c.accentDanger,
  warning: c.accentWarning,
  muted: c.textMuted,
  faint: c.textDisabled,
};

export const dday = styleVariants(DDAY_COLORS, (color) => [ddayBase, { color }]);
