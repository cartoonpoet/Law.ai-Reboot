import { style } from "@vanilla-extract/css";
import { themeVars } from "@lawkit/ui";

const c = themeVars.color;

export const pageHead = style({ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 });
export const pageTitle = style({ margin: "4px 0 0", fontSize: 20, fontWeight: 700, color: c.textHeading });
export const headActions = style({ display: "flex", gap: 8 });
export const filters = style({ marginBottom: 12, maxWidth: 340 });
export const status = style({ padding: "24px 0", textAlign: "center", color: c.textMuted, fontSize: 13 });
// lawkit Alert 에는 danger/error 타입이 없다(info/confirm/secret/saveTemporarily 뿐) — 에러 텍스트는
// DeleteContractModal 등 기존 화면과 같은 방식으로 토큰 색을 입힌 <p> 로 표시한다.
export const errorText = style({ fontSize: 12.5, color: c.accentDanger, margin: "0 0 12px" });
