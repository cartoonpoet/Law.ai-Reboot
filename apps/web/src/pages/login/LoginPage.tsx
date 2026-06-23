import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Tabs, Alert } from "@lawkit/ui";
import { SESSION_EXPIRED_PARAM, SESSION_EXPIRED_VALUE } from "../../api/tokens";
import { AuthCard } from "./AuthCard";
import { EmailLoginForm } from "./EmailLoginForm";
import { SsoLoginForm } from "./SsoLoginForm";
import { OtpLoginForm } from "./OtpLoginForm";
import * as css from "./auth.css";

type LoginMethod = "email" | "sso" | "otp";

export function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [method, setMethod] = useState<LoginMethod>("email");

  // 세션 만료로 리다이렉트된 경우(/login?expired=1) 안내 Alert을 렌더 중 파생.
  // 로그인 성공 시 네비게이션으로 자연히 사라진다.
  const isExpired = params.get(SESSION_EXPIRED_PARAM) === SESSION_EXPIRED_VALUE;

  const signupLink = (
    <div className={css.belowRow}>
      계정이 없으신가요?{" "}
      <button type="button" onClick={() => navigate("/signup")} className={css.linkBtn}>
        회원가입
      </button>
    </div>
  );

  return (
    <AuthCard belowCard={signupLink}>
      {/* Alert.type "success"는 @lawkit/ui에 없어 "info"로 안내. */}
      {isExpired && (
        <div className={css.tabsWrap}>
          <Alert type="info" size="small">
            세션이 만료되었습니다. 다시 로그인해 주세요.
          </Alert>
        </div>
      )}
      <h1 className={css.title}>
        법무 워크스페이스에
        <br />
        로그인하세요.
      </h1>
      <p className={css.subtitle}>휴맥스아이티 · 법무팀</p>

      <div className={css.tabsWrap}>
        <Tabs
          value={method}
          onChange={(v) => setMethod(v as LoginMethod)}
          items={[
            { value: "email", label: "이메일" },
            { value: "sso", label: "SSO" },
            { value: "otp", label: "OTP" },
          ]}
        />
      </div>

      <div key={method} className="lp-rise">
        {method === "email" ? (
          <EmailLoginForm />
        ) : method === "sso" ? (
          <SsoLoginForm />
        ) : (
          <OtpLoginForm />
        )}
      </div>
    </AuthCard>
  );
}
