import { Outlet } from "react-router-dom";
import { BrandPanel } from "./BrandPanel";
import * as css from "./auth.css";

/**
 * 인증 화면 레이아웃 라우트. 좌측 BrandPanel(소개)은 고정 유지되고,
 * 우측 카드(폼)만 자식 라우트(Outlet)로 스왑된다 → 로그인↔회원가입↔비번찾기 전환 시
 * 좌측이 리마운트/재애니되지 않는다.
 */
export function AuthLayout() {
  return (
    <div className={css.page}>
      <div className={`brand-col ${css.brandCol}`}>
        <BrandPanel />
      </div>
      <div className={css.rightCol}>
        <Outlet />
      </div>
    </div>
  );
}
