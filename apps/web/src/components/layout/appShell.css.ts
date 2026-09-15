import { style } from "@vanilla-extract/css";

/* 앱 틀 — 사이드바 + 본문(헤더 없음). AI 비서·통합검색창은 fixed 로 위에 뜬다. */
export const shell = style({ display: "flex", height: "100vh", overflow: "hidden" });

export const main = style({ flex: 1, overflowY: "auto", padding: "22px 24px 48px" });
