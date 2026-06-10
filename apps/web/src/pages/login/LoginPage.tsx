import { useState } from "react";
import { Tabs } from "@lawkit/ui";
import { T } from "../../design/tokens";
import { BrandPanel } from "./BrandPanel";
import { EmailLoginForm } from "./EmailLoginForm";
import { SsoLoginForm } from "./SsoLoginForm";
import { OtpLoginForm } from "./OtpLoginForm";

type LoginMethod = "email" | "sso" | "otp";

export function LoginPage() {
  const [method, setMethod] = useState<LoginMethod>("email");

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
          style={{ width: "100%", maxWidth: 396, animationDelay: ".1s" }}
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
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  background: T.primary,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: 14,
                }}
              >
                L
              </div>
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: T.heading,
                }}
              >
                Law<span style={{ color: T.primary }}>.ai</span>
              </span>
            </div>

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
          </div>
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
