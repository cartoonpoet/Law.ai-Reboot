import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs } from "@lawkit/ui";
import { AuthCard } from "./AuthCard";
import { EmailLoginForm } from "./EmailLoginForm";
import { SsoLoginForm } from "./SsoLoginForm";
import { OtpLoginForm } from "./OtpLoginForm";
import * as css from "./auth.css";

type LoginMethod = "email" | "sso" | "otp";

export function LoginPage() {
  const navigate = useNavigate();
  const [method, setMethod] = useState<LoginMethod>("email");

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
