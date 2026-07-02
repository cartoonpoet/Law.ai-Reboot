import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Alert,
  Button,
  Card,
  CardBody,
  Checkbox,
  Input,
  themeVars,
} from "@lawkit/ui";
import { login } from "../../api/auth";
import { clearTokens, setTokens } from "../../api/tokens";

const page: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.4fr 1fr",
  minHeight: "100vh",
};

const leftPane: React.CSSProperties = {
  background:
    "linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0b1220 100%)",
  color: "#e2e8f0",
  padding: 48,
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  position: "relative",
  overflow: "hidden",
};

const animLayer: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
};

const contentLayer: React.CSSProperties = {
  position: "relative",
  zIndex: 1,
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  height: "100%",
};

const brand: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
};

const brandLogo: React.CSSProperties = {
  width: 36,
  height: 36,
  background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)",
  borderRadius: 8,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#fff",
  fontWeight: 800,
  fontSize: 18,
};

const brandText: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 700,
  letterSpacing: -0.2,
};

const brandBadge: React.CSSProperties = {
  marginLeft: 8,
  padding: "2px 8px",
  borderRadius: 4,
  background: "rgba(59,130,246,.15)",
  color: "#93c5fd",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 0.4,
  textTransform: "uppercase",
};

const heroBlock: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 16,
  maxWidth: 480,
};

const heroTitle: React.CSSProperties = {
  fontSize: 38,
  fontWeight: 800,
  lineHeight: 1.2,
  margin: 0,
  letterSpacing: -0.8,
};

const heroSub: React.CSSProperties = {
  fontSize: 15,
  color: "#94a3b8",
  lineHeight: 1.6,
  margin: 0,
};

const heroChips: React.CSSProperties = {
  display: "flex",
  gap: 8,
  marginTop: 4,
  flexWrap: "wrap",
};

const chip: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 999,
  background: "rgba(148,163,184,.1)",
  border: "1px solid rgba(148,163,184,.18)",
  fontSize: 12,
  color: "#cbd5e1",
};

const footMeta: React.CSSProperties = {
  fontSize: 12,
  color: "#64748b",
  display: "flex",
  gap: 16,
};

const rightPane: React.CSSProperties = {
  background: themeVars.color.neutralBackground,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 32,
};

const formCardWrap: React.CSSProperties = {
  width: "100%",
  maxWidth: 400,
};

const formTitle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 800,
  color: themeVars.color.textHeading,
  margin: "0 0 6px",
  letterSpacing: -0.4,
};

const formSub: React.CSSProperties = {
  fontSize: 13,
  color: themeVars.color.textMuted,
  margin: "0 0 20px",
};

const fieldStack: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 14,
};

const label: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: themeVars.color.textHeading,
  marginBottom: 6,
  display: "block",
};

const row: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  fontSize: 13,
  color: themeVars.color.textSecondary,
};

const link: React.CSSProperties = {
  color: themeVars.color.accentPrimary,
  textDecoration: "none",
  fontSize: 13,
  fontWeight: 600,
};

const errBox: React.CSSProperties = {
  marginTop: 12,
};

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reason = searchParams.get("reason");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [keepSignedIn, setKeepSignedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const { user, tokens } = await login({ email, password });
      // admin 가드 — isSystemAdmin 이 아닌 사용자가 admin 콘솔 로그인 시도해도 토큰 저장하지 않음.
      if (!user.isSystemAdmin) {
        clearTokens();
        setError("관리자 권한이 없는 계정입니다.");
        return;
      }
      setTokens({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        isSystemAdmin: user.isSystemAdmin,
        name: user.name,
        email: user.email,
      });
      // keepSignedIn 옵션은 후속에서 sessionStorage 분기 도입 — MVP 는 항상 localStorage.
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // reason 쿼리: RequireAdmin 가드가 admin 아닌 사용자 차단했을 때 안내.
  const initialNotice =
    reason === "forbidden"
      ? "관리자 권한이 필요합니다. 관리자 계정으로 로그인해 주세요."
      : null;

  return (
    <div style={page}>
      <aside style={leftPane}>
        <div style={animLayer}>
          <div className="lawai-blob lawai-blob-a" />
          <div className="lawai-blob lawai-blob-b" />
          <div className="lawai-blob lawai-blob-c" />
        </div>
        <div style={contentLayer}>
          <div style={brand}>
            <div style={brandLogo}>L</div>
            <span style={brandText}>Law.ai</span>
            <span style={brandBadge}>Admin Console</span>
          </div>

          <div style={heroBlock}>
            <h1 style={heroTitle}>관리자 콘솔에 접속</h1>
            <p style={heroSub}>
              계약·사용자·감사 로그를 한 곳에서 관리합니다. 모든 작업은 감사
              로그에 기록되며, 관리자 권한이 있는 계정만 접속할 수 있어요.
            </p>
            <div style={heroChips}>
              <span style={chip}>● 시스템 상태 모니터링</span>
              <span style={chip}>● 사용자 권한 관리</span>
              <span style={chip}>● 감사 로그</span>
            </div>
          </div>

          <div style={footMeta}>
            <span>v0.1.0</span>
            <span>·</span>
            <span>2026 © Law.ai</span>
          </div>
        </div>
      </aside>

      <main style={rightPane}>
        <div style={formCardWrap}>
          <Card bordered>
            <CardBody>
              <h2 style={formTitle}>관리자 로그인</h2>
              <p style={formSub}>이메일과 비밀번호로 로그인하세요.</p>

              {initialNotice && (
                <div style={{ marginBottom: 12 }}>
                  <Alert type="info" size="small">
                    {initialNotice}
                  </Alert>
                </div>
              )}

              <form style={fieldStack} onSubmit={handleSubmit}>
                <div>
                  <label style={label} htmlFor="email">
                    이메일
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@law.ai"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
                <div>
                  <label style={label} htmlFor="password">
                    비밀번호
                  </label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </div>

                <div style={row}>
                  <Checkbox
                    size="small"
                    label="로그인 상태 유지"
                    checked={keepSignedIn}
                    onCheckedChange={setKeepSignedIn}
                  />
                  <a href="#" style={link}>
                    비밀번호 찾기
                  </a>
                </div>

                <Button type="submit" size="large" disabled={isSubmitting}>
                  {isSubmitting ? "로그인 중…" : "관리자 로그인"}
                </Button>
              </form>

              {error && (
                <div style={errBox}>
                  <Alert type="info" size="small">
                    {error}
                  </Alert>
                </div>
              )}

              <div style={{ marginTop: 16 }}>
                <Alert type="info" size="small">
                  이 페이지는 시스템 관리자 전용입니다. 일반 사용자는{" "}
                  <a href="https://lawai-reboot.kro.kr" style={link}>
                    lawai-reboot.kro.kr
                  </a>{" "}
                  로 이동해 주세요. 모든 로그인 시도는 감사 로그에 기록됩니다.
                </Alert>
              </div>
            </CardBody>
          </Card>
        </div>
      </main>
    </div>
  );
}
