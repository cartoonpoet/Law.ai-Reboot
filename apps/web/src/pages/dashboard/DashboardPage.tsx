import { Icon, Button } from "@lawkit/ui";
import { T } from "../../design/tokens";
import { PipelineStrip } from "./PipelineStrip";
import { AiBrief } from "./AiBrief";
import { TodoPanel } from "./TodoPanel";
import { SideRail } from "./SideRail";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: T.faint,
        letterSpacing: "0.07em",
        textTransform: "uppercase",
      }}
    >
      {children}
    </div>
  );
}

export function DashboardPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          paddingBottom: 12,
          borderBottom: `1px solid ${T.border}`,
        }}
      >
        <div>
          <Eyebrow>법무 대시보드</Eyebrow>
          <h1
            style={{
              margin: "7px 0 0",
              fontSize: 22,
              fontWeight: 800,
              color: T.heading,
              letterSpacing: "-0.025em",
            }}
          >
            업무 요약
          </h1>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            paddingBottom: 2,
          }}
        >
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontSize: 11,
                color: T.faint,
                fontWeight: 600,
                marginBottom: 1,
              }}
            >
              처리 대기
            </div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: T.heading,
                letterSpacing: "-0.02em",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              5
            </div>
          </div>
          <div
            style={{ width: 1, height: 26, background: T.border }}
          />
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontSize: 11,
                color: T.faint,
                fontWeight: 600,
                marginBottom: 1,
              }}
            >
              기한 임박
            </div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: T.danger,
                letterSpacing: "-0.02em",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              2
            </div>
          </div>
          <div
            style={{ width: 1, height: 26, background: T.border }}
          />
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontSize: 12.5,
                fontWeight: 600,
                color: T.body,
              }}
            >
              2026.06.09 (화)
            </div>
            <div style={{ fontSize: 11, color: T.faint, marginTop: 2 }}>
              마지막 동기화 09:42
            </div>
          </div>
          <Button
            size="small"
            iconLeft={
              <Icon
                name="contractEdit"
                size="sm"
                style={{ width: 13, height: 13 }}
              />
            }
          >
            검토 요청
          </Button>
        </div>
      </div>

      <AiBrief />
      <PipelineStrip />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 312px",
          gap: 16,
          alignItems: "start",
        }}
      >
        <TodoPanel />
        <SideRail />
      </div>
    </div>
  );
}
