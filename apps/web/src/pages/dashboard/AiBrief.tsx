import { Button } from "@lawkit/ui";
import { T } from "../../design/tokens";
import { AI_BRIEF } from "./mock-data";

const TONE_COLOR = {
  danger: T.danger,
  primary: T.primary,
  warning: T.warning,
} as const;

export function AiBrief() {
  return (
    <div
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: T.radius,
        boxShadow: T.shadowCard,
        padding: "14px 16px 16px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 11,
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontSize: 10.5,
            fontWeight: 700,
            color: T.primaryDark,
            background: T.primarySoft,
            border: `1px solid ${T.primary}33`,
            padding: "2px 7px",
            borderRadius: 4,
            letterSpacing: "0.04em",
          }}
        >
          <span
            style={{
              width: 4,
              height: 4,
              borderRadius: 999,
              background: T.primary,
            }}
          />
          AI 요약
        </span>
        <span style={{ fontSize: 11.5, color: T.faint }}>오늘 09:30 기준</span>
      </div>

      <div
        style={{
          fontSize: 14.5,
          fontWeight: 700,
          color: T.heading,
          letterSpacing: "-0.015em",
          marginBottom: 11,
        }}
      >
        {AI_BRIEF.headline}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {AI_BRIEF.points.map((p, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              gap: 9,
              padding: "9px 12px",
              borderRadius: 6,
              background: T.surfaceAlt,
              border: `1px solid ${T.border}`,
            }}
          >
            <span
              style={{
                width: 2.5,
                borderRadius: 2,
                background: TONE_COLOR[p.tone],
                flexShrink: 0,
              }}
            />
            <span
              style={{ fontSize: 12.5, color: T.body, lineHeight: 1.5 }}
            >
              {p.text}
            </span>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
        <Button size="small">미배정 배정하기</Button>
        <Button size="small" variant="outline" color="secondary">
          리스크 검토
        </Button>
        <Button size="small" variant="outline" color="secondary">
          기일 준비
        </Button>
      </div>
    </div>
  );
}
