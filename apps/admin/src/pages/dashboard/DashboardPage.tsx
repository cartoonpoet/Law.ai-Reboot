import { useNavigate } from "react-router-dom";
import { Button, Card, CardBody, themeVars } from "@lawkit/ui";
import { clearTokens, getEmail, getName } from "../../api/tokens";

const wrap: React.CSSProperties = {
  maxWidth: 1100,
  margin: "32px auto",
  padding: "0 24px",
  display: "flex",
  flexDirection: "column",
  gap: 16,
};

const headerRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 4,
};

const title: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 800,
  color: themeVars.color.textHeading,
  margin: 0,
  letterSpacing: -0.4,
};

const sub: React.CSSProperties = {
  fontSize: 13,
  color: themeVars.color.textMuted,
  margin: "4px 0 0",
};

const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: 12,
};

const statLabel: React.CSSProperties = {
  fontSize: 12,
  color: themeVars.color.textMuted,
  margin: 0,
};

const statValue: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 800,
  color: themeVars.color.textHeading,
  margin: "4px 0 0",
  letterSpacing: -0.6,
};

const placeholderBox: React.CSSProperties = {
  padding: 18,
  textAlign: "center",
  color: themeVars.color.textMuted,
  fontSize: 13,
};

export function DashboardPage() {
  const navigate = useNavigate();
  const name = getName();
  const email = getEmail();

  const handleLogout = () => {
    clearTokens();
    navigate("/login", { replace: true });
  };

  return (
    <div style={wrap}>
      <div style={headerRow}>
        <div>
          <h1 style={title}>대시보드</h1>
          <p style={sub}>
            {name ? `${name} 님` : "관리자"} 환영합니다. ({email})
          </p>
        </div>
        <Button variant="outline" color="secondary" onClick={handleLogout}>
          로그아웃
        </Button>
      </div>

      <div style={grid}>
        <Card bordered>
          <CardBody>
            <p style={statLabel}>계약 총건</p>
            <p style={statValue}>—</p>
          </CardBody>
        </Card>
        <Card bordered>
          <CardBody>
            <p style={statLabel}>사용자</p>
            <p style={statValue}>—</p>
          </CardBody>
        </Card>
        <Card bordered>
          <CardBody>
            <p style={statLabel}>R2 파일</p>
            <p style={statValue}>—</p>
          </CardBody>
        </Card>
        <Card bordered>
          <CardBody>
            <p style={statLabel}>최근 7일 비교 보고서</p>
            <p style={statValue}>—</p>
          </CardBody>
        </Card>
      </div>

      <Card bordered title="최근 감사 이벤트">
        <CardBody>
          <div style={placeholderBox}>
            백엔드 admin 엔드포인트 연결 후 표시됩니다 (다음 PR).
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
