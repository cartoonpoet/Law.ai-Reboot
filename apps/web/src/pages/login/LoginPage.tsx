import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Icon, Button, Input, InputGroup, Checkbox, Tabs } from "@lawkit/ui";
import { login } from "../../api/auth";
import type { LoginRequest } from "@lawai/contracts";
import { T } from "../../design/tokens";
import { BrandPanel } from "./BrandPanel";

type LoginMethod = "email" | "sso";

export function LoginPage() {
  const navigate = useNavigate();
  const [method, setMethod] = useState<LoginMethod>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [keep, setKeep] = useState(true);

  const mutation = useMutation({
    mutationFn: (req: LoginRequest) => login(req),
    onSuccess: (data) => {
      localStorage.setItem("accessToken", data.tokens.accessToken);
      localStorage.setItem("refreshToken", data.tokens.refreshToken);
      navigate("/");
    },
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    mutation.mutate({ email, password });
  }

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
                ]}
              />
            </div>

            {method === "email" ? (
              <form
                key="email"
                onSubmit={onSubmit}
                style={{ display: "flex", flexDirection: "column", gap: 14 }}
              >
                <InputGroup label="이메일">
                  <Input
                    inputSize="large"
                    type="email"
                    placeholder="email@humaxit.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    leftIcon={
                      <Icon
                        name="mail"
                        size="sm"
                        style={{ width: 15, height: 15, color: T.faint }}
                      />
                    }
                  />
                </InputGroup>
                <InputGroup label="비밀번호">
                  <Input
                    inputSize="large"
                    type={showPw ? "text" : "password"}
                    placeholder="비밀번호 입력"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    leftIcon={
                      <Icon
                        name="lock"
                        size="sm"
                        style={{ width: 15, height: 15, color: T.faint }}
                      />
                    }
                    rightIcon={
                      <button
                        type="button"
                        onClick={() => setShowPw((s) => !s)}
                        aria-label={showPw ? "비밀번호 숨기기" : "비밀번호 보기"}
                        style={{
                          background: "none",
                          border: "none",
                          padding: 0,
                          cursor: "pointer",
                          display: "inline-flex",
                        }}
                      >
                        <Icon
                          name={showPw ? "eyeOff" : "eye"}
                          size="sm"
                          style={{ width: 15, height: 15, color: T.faint }}
                        />
                      </button>
                    }
                  />
                </InputGroup>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Checkbox
                    size="small"
                    label="자동 로그인"
                    checked={keep}
                    onCheckedChange={setKeep}
                  />
                  <button
                    type="button"
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
                    비밀번호 찾기
                  </button>
                </div>
                <div style={{ display: "grid", marginTop: 2 }}>
                  <Button
                    size="large"
                    type="submit"
                    disabled={mutation.isPending}
                    iconRight={
                      <Icon
                        name="arrowRight"
                        size="sm"
                        style={{ width: 15, height: 15 }}
                      />
                    }
                  >
                    로그인
                  </Button>
                </div>
                {mutation.isError && (
                  <p
                    role="alert"
                    style={{
                      margin: 0,
                      fontSize: 13,
                      color: T.danger,
                      textAlign: "center",
                    }}
                  >
                    {mutation.error.message}
                  </p>
                )}
              </form>
            ) : (
              <div
                key="sso"
                style={{ display: "flex", flexDirection: "column", gap: 14 }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "14px 16px",
                    borderRadius: 10,
                    background: T.primaryTint,
                    border: `1px solid ${T.primary}22`,
                  }}
                >
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 9,
                      background: T.navy,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon
                      name="shieldSolid2"
                      size="md"
                      style={{ width: 20, height: 20, color: "#fff" }}
                    />
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 13.5,
                        fontWeight: 700,
                        color: T.heading,
                      }}
                    >
                      휴맥스 SSO 계정
                    </div>
                    <div
                      style={{ fontSize: 12, color: T.muted, marginTop: 2 }}
                    >
                      사내 통합 계정으로 안전하게 로그인합니다.
                    </div>
                  </div>
                </div>
                <div style={{ display: "grid" }}>
                  <Button
                    size="large"
                    iconLeft={
                      <Icon
                        name="logIn"
                        size="sm"
                        style={{ width: 15, height: 15 }}
                      />
                    }
                  >
                    휴맥스 SSO로 계속
                  </Button>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 6,
                    fontSize: 12,
                    color: T.faint,
                    lineHeight: 1.5,
                  }}
                >
                  <Icon
                    name="info"
                    size="sm"
                    style={{
                      width: 13,
                      height: 13,
                      marginTop: 1,
                      flexShrink: 0,
                    }}
                  />
                  SSO 연동 계정이 없으면 시스템 관리자(내선 8230)에게 문의하세요.
                </div>
              </div>
            )}
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
