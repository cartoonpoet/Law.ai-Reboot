import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs } from "@lawkit/ui";
import { T } from "../../design/tokens";
import { AuthLayout } from "./AuthLayout";
import { EmailLoginForm } from "./EmailLoginForm";
import { SsoLoginForm } from "./SsoLoginForm";
import { OtpLoginForm } from "./OtpLoginForm";

type LoginMethod = "email" | "sso" | "otp";

export function LoginPage() {
  const navigate = useNavigate();
  const [method, setMethod] = useState<LoginMethod>("email");

  const signupLink = (
    <div
      style={{
        marginTop: 16,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        fontSize: 12.5,
        color: T.muted,
      }}
    >
      계정이 없으신가요?{" "}
      <button
        type="button"
        onClick={() => navigate("/signup")}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          fontSize: 12.5,
          fontWeight: 700,
          color: T.primary,
          fontFamily: "Pretendard",
          padding: 0,
        }}
      >
        회원가입
      </button>
    </div>
  );

  return (
    <AuthLayout belowCard={signupLink}>
      <h1
        style={{
          margin: "0 0 6px",
          fontSize: 21,
          fontWeight: 800,
          color: T.heading,
          letterSpacing: "-0.025em",
          lineHeight: 1.3,
        }}
      >
        법무 워크스페이스에
        <br />
        로그인하세요.
      </h1>
      <p style={{ margin: "0 0 20px", fontSize: 13, color: T.muted }}>
        휴맥스아이티 · 법무팀
      </p>

      <div style={{ marginBottom: 18 }}>
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
    </AuthLayout>
  );
}
