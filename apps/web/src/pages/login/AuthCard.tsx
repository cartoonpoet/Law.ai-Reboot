import type { ReactNode } from "react";
import { Logo } from "../../components/ui/Logo";
import * as css from "./auth.css";

interface AuthCardProps {
  /** 카드 내부 콘텐츠 (제목·부제·폼) */
  children: ReactNode;
  /** 카드 아래 링크 영역(회원가입/로그인 등) */
  belowCard?: ReactNode;
  /** 넓은 카드(회원가입) */
  wide?: boolean;
}

/** 우측에서 라우트마다 스왑되는 인증 카드(로고 + 콘텐츠 + 하단 링크 + 내선 안내). */
export function AuthCard({ children, belowCard, wide }: AuthCardProps) {
  return (
    <div className={`lp-rise ${wide ? css.rise.wide : css.rise.normal}`}>
      <div className={css.card}>
        <div className={css.logoRow}>
          <Logo size={24} />
          <span className={css.brand}>Law<span className={css.brandDot}>.ai</span></span>
        </div>
        {children}
      </div>
      {belowCard}
      <div className={css.footer}>
        계정 문의 · 법무팀 시스템 관리자 <b className={css.footerStrong}>내선 8230</b>
      </div>
    </div>
  );
}
