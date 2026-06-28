import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, CardBody, themeVars } from "@lawkit/ui";
import { clearTokens, getEmail, getName } from "../../api/tokens";
import { getAdminAudit, getAdminStats } from "../../api/admin";

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

const statHint: React.CSSProperties = {
  fontSize: 11,
  color: themeVars.color.textMuted,
  margin: "6px 0 0",
};

const auditList: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
};

const auditRow: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "120px 1fr 140px",
  gap: 12,
  padding: "10px 4px",
  borderBottom: `1px solid ${themeVars.color.neutralBorder}`,
  fontSize: 13,
  alignItems: "center",
};

const auditAction: React.CSSProperties = {
  fontWeight: 700,
  color: themeVars.color.textHeading,
};

const auditMeta: React.CSSProperties = {
  fontSize: 12,
  color: themeVars.color.textMuted,
  textAlign: "right",
  fontVariantNumeric: "tabular-nums",
};

const placeholderBox: React.CSSProperties = {
  padding: 18,
  textAlign: "center",
  color: themeVars.color.textMuted,
  fontSize: 13,
};

const ACTION_LABEL: Record<string, string> = {
  create: "생성",
  update: "수정",
  delete: "삭제",
  transition: "상태전이",
  view: "조회",
  compare_report_download: "비교 보고서 다운로드",
};

const formatBytes = (n: number): string => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
};

const formatRelative = (iso: string): string => {
  const at = new Date(iso).getTime();
  const diff = Date.now() - at;
  if (diff < 60_000) return "방금";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}분 전`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}시간 전`;
  return `${Math.floor(diff / 86_400_000)}일 전`;
};

export function DashboardPage() {
  const navigate = useNavigate();
  const name = getName();
  const email = getEmail();

  const stats = useQuery({
    queryKey: ["admin-stats"],
    queryFn: getAdminStats,
  });
  const audit = useQuery({
    queryKey: ["admin-audit", 20],
    queryFn: () => getAdminAudit(20),
  });

  const handleLogout = () => {
    clearTokens();
    navigate("/login", { replace: true });
  };

  const renderStat = (
    label: string,
    value: string | number | null,
    hint?: string,
  ) => (
    <Card bordered>
      <CardBody>
        <p style={statLabel}>{label}</p>
        <p style={statValue}>
          {stats.isLoading ? "…" : value ?? "—"}
        </p>
        {hint && <p style={statHint}>{hint}</p>}
      </CardBody>
    </Card>
  );

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
        {renderStat(
          "계약 총건",
          stats.data?.contracts.total ?? null,
          stats.data
            ? stats.data.contracts.byStatus
                .map((s) => `${s.status} ${s.count}`)
                .join(" · ")
            : undefined,
        )}
        {renderStat("사용자", stats.data?.users.total ?? null)}
        {renderStat(
          "R2 파일",
          stats.data?.files.total ?? null,
          stats.data ? formatBytes(stats.data.files.bytesTotal) : undefined,
        )}
        {renderStat(
          "최근 7일 비교 보고서",
          stats.data?.recentCompareReports ?? null,
        )}
      </div>

      <Card bordered title="최근 감사 이벤트">
        <CardBody>
          {audit.isLoading && <div style={placeholderBox}>불러오는 중…</div>}
          {audit.error && (
            <div style={placeholderBox}>
              감사 로그를 불러올 수 없습니다.
            </div>
          )}
          {audit.data && audit.data.items.length === 0 && (
            <div style={placeholderBox}>아직 감사 이벤트가 없습니다.</div>
          )}
          {audit.data && audit.data.items.length > 0 && (
            <div style={auditList}>
              {audit.data.items.map((e) => (
                <div key={e.id} style={auditRow}>
                  <span style={auditAction}>
                    {ACTION_LABEL[e.action] ?? e.action}
                  </span>
                  <span>
                    {e.actorName ?? e.actorId} ·{" "}
                    <span style={{ color: themeVars.color.textMuted }}>
                      {e.targetType} {e.targetId.slice(0, 8)}
                    </span>
                  </span>
                  <span style={auditMeta}>{formatRelative(e.at)}</span>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
