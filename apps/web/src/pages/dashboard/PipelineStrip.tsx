import { Icon } from "@lawkit/ui";
import { T } from "../../design/tokens";
import { FLOW_STAGES } from "./mock-data";

const TONE = {
  danger:  { bar: T.danger,   text: T.danger,  bg: "#fdf0f0" },
  primary: { bar: T.primary,  text: T.primary, bg: "#f0f3ff" },
  success: { bar: T.success,  text: T.success, bg: "#f0faf5" },
  warning: { bar: T.warning,  text: T.warning, bg: "#fdf6ec" },
  neutral: { bar: T.borderStrong, text: T.muted, bg: T.surfaceAlt },
} as const;

export function PipelineStrip() {
  const maxCount = Math.max(...FLOW_STAGES.map((s) => s.count));

  return (
    <div
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: T.radius,
        boxShadow: T.shadowCard,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "11px 16px",
          borderBottom: `1px solid ${T.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <Icon
            name="fileText"
            size="sm"
            style={{ width: 14, height: 14, color: T.muted }}
          />
          <span
            style={{ fontSize: 13, fontWeight: 700, color: T.heading }}
          >
            계약 검토 파이프라인
          </span>
        </div>
        <span style={{ fontSize: 11.5, color: T.faint }}>
          오늘 09:42 기준 · 160건 진행 중
        </span>
      </div>

      <div style={{ display: "flex" }}>
        {FLOW_STAGES.map((stage, idx) => {
          const tone = TONE[stage.tone ?? "neutral"];
          const barH = Math.max(3, Math.round((stage.count / maxCount) * 26));
          const isLast = idx === FLOW_STAGES.length - 1;

          return (
            <div key={stage.id} style={{ display: "flex", alignItems: "center", flex: 1 }}>
              <div
                style={{
                  flex: 1,
                  padding: "13px 14px 12px",
                  cursor: "pointer",
                  background: stage.bottleneck ? tone.bg : "transparent",
                  position: "relative",
                }}
              >
                {stage.bottleneck && (
                  <div
                    style={{
                      position: "absolute",
                      top: 7,
                      right: 8,
                      fontSize: 9.5,
                      fontWeight: 700,
                      color: tone.text,
                      background: "#fff",
                      border: `1px solid ${tone.bar}44`,
                      padding: "1px 5px",
                      borderRadius: 3,
                    }}
                  >
                    병목
                  </div>
                )}
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: T.faint,
                    marginBottom: 8,
                    whiteSpace: "nowrap",
                  }}
                >
                  {stage.label}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-end",
                    height: 28,
                    marginBottom: 7,
                  }}
                >
                  <div
                    style={{
                      width: "55%",
                      height: barH,
                      background: tone.bar,
                      borderRadius: 3,
                      opacity: stage.bottleneck ? 0.9 : 0.35,
                    }}
                  />
                </div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    color: stage.bottleneck ? tone.text : T.heading,
                    letterSpacing: "-0.03em",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {stage.count}
                </div>
                <div style={{ fontSize: 11, color: T.faint, marginTop: 1 }}>
                  건
                </div>
              </div>
              {!isLast && (
                <Icon
                  name="chevronRight"
                  size="sm"
                  style={{ width: 11, height: 11, color: T.borderStrong, flexShrink: 0 }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
