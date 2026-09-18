import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, CardBody, themeVars } from "@lawkit/ui";
import { getName } from "../../api/tokens";
import { getAdminAudit, getAdminStats } from "../../api/admin";
import { AdminShell } from "../../components/layout/AdminShell";
import { useSupportOpenCount } from "../support/hooks/useSupportOpenCount";

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
  const { openCount } = useSupportOpenCount();

  const stats = useQuery({
    queryKey: ["admin-stats"],
    queryFn: getAdminStats,
  });
  const audit = useQuery({
    queryKey: ["admin-audit", 20],
    queryFn: () => getAdminAudit({ limit: 20 }),
  });

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
    <AdminShell
      title="대시보드"
      description={`${name ? `${name} 님, ` : ""}오늘 서비스 상태입니다.`}
      actions={
        openCount !== null && openCount > 0 ? (
          <Button onClick={() => navigate("/support")}>답변 대기 문의 {openCount}건</Button>
        ) : undefined
      }
    >
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
        {renderStat("답변 대기 문의", openCount, "로아이에서 들어온 문의")}
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
    </AdminShell>
  );
}
