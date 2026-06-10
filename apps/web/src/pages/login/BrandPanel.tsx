import { useState, useEffect } from "react";
import { Icon } from "@lawkit/ui";
import { T } from "../../design/tokens";
import { Logo } from "../../components/ui/Logo";

const PIPELINE_STAGES = ["검토 의뢰", "법무 검토", "체결"] as const;

const PACKETS = [
  { delay: 0, color: "#7aa4ff" },
  { delay: 2.3, color: "#ffffff" },
  { delay: 4.6, color: "#5585f8" },
  { delay: 1.1, color: "#9dbeff" },
];

const BULLETS = [
  "계약 검토부터 체결까지, 전 과정을 한 흐름으로",
  "AI가 짚어주는 계약 리스크 사전 점검",
  "송무·자문·지식재산권까지 통합 법무 워크스페이스",
];

function useCountUp(target: number, base: number) {
  const [n, setN] = useState(base);
  useEffect(() => {
    let cur = base;
    const id = setInterval(() => {
      cur += Math.max(1, Math.ceil((target - cur) / 7));
      if (cur >= target) {
        cur = target;
        clearInterval(id);
      }
      setN(cur);
    }, 55);
    return () => clearInterval(id);
  }, [target, base]);
  return n;
}

function LivePipeline() {
  return (
    <div style={{ position: "relative", height: 80, margin: "0 0 28px" }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 22,
          height: 1,
          background: "rgba(255,255,255,.12)",
        }}
      />
      {PIPELINE_STAGES.map((label, i) => {
        const isCenter = i === 1;
        return (
          <div
            key={label}
            style={{
              position: "absolute",
              left: `${8 + i * 42}%`,
              top: 0,
              transform: "translateX(-50%)",
              textAlign: "center",
            }}
          >
            <div
              style={{
                position: "relative",
                width: 14,
                height: 14,
                margin: "16px auto 0",
              }}
            >
              {isCenter && (
                <span
                  style={{
                    position: "absolute",
                    inset: -6,
                    borderRadius: 999,
                    border: "1.5px solid rgba(255,255,255,.4)",
                    animation: "lp-ring 2.4s ease-out infinite",
                  }}
                />
              )}
              <span
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: 999,
                  background: isCenter ? "#fff" : "rgba(255,255,255,.4)",
                  animation: isCenter
                    ? "lp-pulse 2.4s ease-in-out infinite"
                    : "none",
                }}
              />
            </div>
            <div
              style={{
                marginTop: 11,
                fontSize: 11,
                color: "rgba(255,255,255,.65)",
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
            >
              {label}
            </div>
          </div>
        );
      })}
      {PACKETS.map((p, i) => (
        <div
          key={i}
          className="lp-packet"
          style={{ top: 14, animationDelay: `${p.delay}s` }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "2px 7px",
              borderRadius: 5,
              background: "rgba(255,255,255,.09)",
              border: "1px solid rgba(255,255,255,.18)",
            }}
          >
            <span
              style={{
                width: 4,
                height: 4,
                borderRadius: 999,
                background: p.color,
              }}
            />
            <span
              style={{
                width: 20,
                height: 3,
                borderRadius: 2,
                background: "rgba(255,255,255,.45)",
              }}
            />
          </span>
        </div>
      ))}
    </div>
  );
}

export function BrandPanel() {
  const count = useCountUp(1284, 1180);
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        position: "relative",
        overflow: "hidden",
        background: T.navy,
        color: "#fff",
        padding: "52px 48px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.04,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 3,
          height: "100%",
          background: T.primary,
          opacity: 0.65,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -80,
          right: -60,
          width: 280,
          height: 280,
          borderRadius: 999,
          background: `radial-gradient(circle, ${T.primary}28, transparent 65%)`,
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <Logo size={30} />
        <span
          style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-0.02em" }}
        >
          Law<span style={{ opacity: 0.5 }}>.ai</span>
        </span>
        <div
          style={{
            marginLeft: 4,
            fontSize: 10,
            fontWeight: 700,
            color: T.primary,
            background: `${T.primary}22`,
            border: `1px solid ${T.primary}40`,
            padding: "2px 6px",
            borderRadius: 4,
            letterSpacing: "0.04em",
          }}
        >
          BETA
        </div>
      </div>

      <div style={{ position: "relative" }}>
        <div className="lp-rise" style={{ animationDelay: ".05s" }}>
          <LivePipeline />
        </div>
        <h2
          className="lp-rise"
          style={{
            margin: 0,
            fontSize: 30,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            lineHeight: 1.28,
            animationDelay: ".1s",
          }}
        >
          법무 업무의 모든 흐름을,
          <br />
          한 곳에서.
        </h2>
        <div
          className="lp-rise"
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 7,
            marginTop: 16,
            animationDelay: ".18s",
          }}
        >
          <span style={{ fontSize: 12.5, color: T.navyText }}>
            지금까지 검토된 계약
          </span>
          <b
            style={{
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {count.toLocaleString("ko-KR")}
          </b>
          <span style={{ fontSize: 12.5, color: T.navyText }}>건</span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              marginLeft: 2,
              fontSize: 11,
            }}
          >
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: 999,
                background: "#5adc8c",
                animation: "lp-pulse 1.8s ease-in-out infinite",
              }}
            />
            실시간
          </span>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 11,
            marginTop: 24,
          }}
        >
          {BULLETS.map((b, i) => (
            <div
              key={i}
              className="lp-rise"
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                animationDelay: `${0.26 + i * 0.08}s`,
              }}
            >
              <span
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 4,
                  background: `${T.primary}55`,
                  border: `1px solid ${T.primary}80`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: 1,
                }}
              >
                <Icon
                  name="check"
                  size="sm"
                  style={{ width: 10, height: 10, color: "#fff" }}
                />
              </span>
              <span
                style={{ fontSize: 13.5, color: T.navyText, lineHeight: 1.5 }}
              >
                {b}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{ position: "relative", fontSize: 11.5, color: T.navyFaint }}
      >
        © 2026 Humax IT · Law.ai
      </div>
    </div>
  );
}
