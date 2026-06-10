import type { ReactNode } from "react";
import { T } from "../../design/tokens";
import { Logo } from "../../components/ui/Logo";
import { BrandPanel } from "./BrandPanel";

interface AuthLayoutProps {
  /** 카드 내부 콘텐츠 (제목·부제·폼) */
  children: ReactNode;
  /** 카드 아래, 내선 안내 위에 들어가는 페이지별 링크 영역 */
  belowCard?: ReactNode;
  /** 카드 최대 너비 (기본 396, 회원가입은 440) */
  cardMaxWidth?: number;
}

export function AuthLayout({
  children,
  belowCard,
  cardMaxWidth = 396,
}: AuthLayoutProps) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", background: T.surface }}>
      <div
        className="brand-col"
        style={{ display: "flex", flex: "0 0 44%", maxWidth: 540 }}
      >
        <BrandPanel />
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px 24px",
          background: T.pageBg,
        }}
      >
        <div
          className="lp-rise"
          style={{ width: "100%", maxWidth: cardMaxWidth, animationDelay: ".1s" }}
        >
          <div
            style={{
              background: T.surface,
              border: `1px solid ${T.border}`,
              borderRadius: 16,
              boxShadow: "0 20px 60px rgba(16,24,40,.1)",
              padding: "28px 28px 26px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                marginBottom: 22,
              }}
            >
              <Logo size={24} />
              <span style={{ fontSize: 15, fontWeight: 700, color: T.heading }}>
                Law<span style={{ color: T.primary }}>.ai</span>
              </span>
            </div>

            {children}
          </div>

          {belowCard}

          <div
            style={{
              marginTop: 14,
              textAlign: "center",
              fontSize: 12,
              color: T.faint,
            }}
          >
            계정 문의 · 법무팀 시스템 관리자{" "}
            <b style={{ color: T.muted }}>내선 8230</b>
          </div>
        </div>
      </div>
    </div>
  );
}
