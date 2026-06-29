import {
  Avatar,
  Button,
  Icon,
  ProgressBar,
  ScheduleItem,
  StatCell,
  StatGrid,
  themeVars,
  Widget,
} from "@lawkit/ui";
import { AdminShell } from "../../components/AdminShell";

// 시안용 mock 데이터 — 실제 /admin/stats 응답 형태에 맞춤.
const STATUS_DIST = [
  { label: "검토 중", count: 42, color: "#3b82f6" },
  { label: "배정 대기", count: 18, color: "#f59e0b" },
  { label: "검토 완료", count: 73, color: "#16a34a" },
  { label: "보류", count: 9, color: "#ef4444" },
];

const RECENT_AUDIT = [
  { action: "비교 보고서 다운로드", actor: "이법무", target: "CTR-2026-0142", at: "방금", kind: "report" },
  { action: "계약 상태전이", actor: "김기획", target: "CTR-2026-0139", at: "3분 전", kind: "transition" },
  { action: "사용자 권한 변경", actor: "손준호", target: "user · 박변호", at: "12분 전", kind: "user" },
  { action: "코멘트 작성", actor: "최담당", target: "CTR-2026-0138", at: "28분 전", kind: "comment" },
  { action: "파일 업로드", actor: "이법무", target: "초안 v2.docx", at: "1시간 전", kind: "file" },
];

const TOP_USERS = [
  { name: "이법무", role: "사내변호사", contracts: 28 },
  { name: "김기획", role: "계약담당자", contracts: 21 },
  { name: "최담당", role: "계약담당자", contracts: 17 },
  { name: "박변호", role: "사외변호사", contracts: 12 },
];

const wrap: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 16,
  maxWidth: 1200,
};

const pageTitle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 800,
  color: themeVars.color.textHeading,
  margin: 0,
  letterSpacing: -0.4,
};

const pageSub: React.CSSProperties = {
  fontSize: 13,
  color: themeVars.color.textMuted,
  margin: "4px 0 0",
};

const twoCol: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "2fr 1fr",
  gap: 16,
  alignItems: "start",
};

const distRow: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
  padding: "4px 2px",
};

const distItem: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

const distHead: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  fontSize: 12,
  color: themeVars.color.textSecondary,
};

const distBarTrack: React.CSSProperties = {
  height: 8,
  borderRadius: 999,
  background: themeVars.color.neutralBackground,
  overflow: "hidden",
};

const auditRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "10px 0",
  borderBottom: `1px solid ${themeVars.color.neutralBorder}`,
};

const auditIcon: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 8,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const auditMain: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
};

const auditAction: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: themeVars.color.textHeading,
};

const auditMeta: React.CSSProperties = {
  fontSize: 12,
  color: themeVars.color.textMuted,
};

const auditTime: React.CSSProperties = {
  fontSize: 11,
  color: themeVars.color.textMuted,
  flexShrink: 0,
  fontVariantNumeric: "tabular-nums",
};

const userRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "8px 0",
  borderBottom: `1px solid ${themeVars.color.neutralBorder}`,
};

const userName: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: themeVars.color.textHeading,
};

const userRole: React.CSSProperties = {
  fontSize: 11,
  color: themeVars.color.textMuted,
};

const userCount: React.CSSProperties = {
  marginLeft: "auto",
  fontSize: 13,
  fontWeight: 700,
  color: themeVars.color.accentPrimary,
  fontVariantNumeric: "tabular-nums",
};

const healthRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 0",
  fontSize: 13,
};

const healthDot = (ok: boolean): React.CSSProperties => ({
  width: 8,
  height: 8,
  borderRadius: 999,
  background: ok ? "#16a34a" : "#ef4444",
});

type AuditIconName =
  | "fileCompare"
  | "refreshCw"
  | "userCheck"
  | "messageSquare"
  | "paperclip";

const AUDIT_ICON_STYLE: Record<
  string,
  { bg: string; color: string; icon: AuditIconName }
> = {
  report: { bg: "#eff6ff", color: "#2563eb", icon: "fileCompare" },
  transition: { bg: "#fef3c7", color: "#d97706", icon: "refreshCw" },
  user: { bg: "#f0fdf4", color: "#16a34a", icon: "userCheck" },
  comment: { bg: "#f5f3ff", color: "#7c3aed", icon: "messageSquare" },
  file: { bg: "#f1f5f9", color: "#475569", icon: "paperclip" },
};

const maxCount = Math.max(...STATUS_DIST.map((s) => s.count));

export function DashboardMock() {
  return (
    <AdminShell
      breadcrumbLabel="대시보드"
      topbarExtra={
        <Button size="small" variant="outline" iconLeft={<Icon name="refreshCw" size="sm" />}>
          새로고침
        </Button>
      }
    >
      <div style={wrap}>
        <div>
          <h1 style={pageTitle}>대시보드</h1>
          <p style={pageSub}>
            손준호 님 환영합니다 · 시스템 현황을 한눈에 확인하세요.
          </p>
        </div>

        {/* 상단 KPI */}
        <Widget title="핵심 지표" flush>
          <StatGrid>
            <StatCell label="계약 총건" value="142" valueColor="primary" />
            <StatCell label="활성 사용자" value="38" valueColor="heading" />
            <StatCell label="R2 파일" value="316" valueColor="heading" />
            <StatCell label="이번 주 비교 보고서" value="27" valueColor="success" />
          </StatGrid>
        </Widget>

        <div style={twoCol}>
          {/* 좌: 계약 상태 분포 + 최근 감사 */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Widget title="계약 상태 분포" badge={142}>
              <div style={distRow}>
                {STATUS_DIST.map((s) => (
                  <div key={s.label} style={distItem}>
                    <div style={distHead}>
                      <span>{s.label}</span>
                      <span style={{ fontWeight: 700, color: themeVars.color.textHeading }}>
                        {s.count}
                      </span>
                    </div>
                    <div style={distBarTrack}>
                      <div
                        style={{
                          width: `${(s.count / maxCount) * 100}%`,
                          height: "100%",
                          background: s.color,
                          borderRadius: 999,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Widget>

            <Widget
              title="최근 감사 이벤트"
              extra={
                <Button size="small" variant="outline">
                  전체 보기
                </Button>
              }
            >
              <div>
                {RECENT_AUDIT.map((e, i) => {
                  const s = AUDIT_ICON_STYLE[e.kind];
                  return (
                    <div
                      key={i}
                      style={{
                        ...auditRow,
                        borderBottom:
                          i === RECENT_AUDIT.length - 1
                            ? "none"
                            : auditRow.borderBottom,
                      }}
                    >
                      <div style={{ ...auditIcon, background: s.bg }}>
                        <Icon name={s.icon} size="sm" />
                      </div>
                      <div style={auditMain}>
                        <div style={auditAction}>{e.action}</div>
                        <div style={auditMeta}>
                          {e.actor} · {e.target}
                        </div>
                      </div>
                      <span style={auditTime}>{e.at}</span>
                    </div>
                  );
                })}
              </div>
            </Widget>
          </div>

          {/* 우: 시스템 상태 + 활동 많은 사용자 + 스토리지 */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Widget title="시스템 상태">
              <div style={healthRow}>
                <span style={healthDot(true)} />
                <span>API 게이트웨이</span>
                <span style={{ marginLeft: "auto", color: "#16a34a", fontWeight: 600 }}>
                  정상
                </span>
              </div>
              <div style={healthRow}>
                <span style={healthDot(true)} />
                <span>PostgreSQL</span>
                <span style={{ marginLeft: "auto", color: "#16a34a", fontWeight: 600 }}>
                  정상
                </span>
              </div>
              <div style={healthRow}>
                <span style={healthDot(true)} />
                <span>Cloudflare R2</span>
                <span style={{ marginLeft: "auto", color: "#16a34a", fontWeight: 600 }}>
                  정상
                </span>
              </div>
            </Widget>

            <Widget title="스토리지 사용량">
              <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "4px 0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: themeVars.color.textSecondary }}>R2 버킷</span>
                  <span style={{ fontWeight: 700, color: themeVars.color.textHeading }}>
                    2.4 GB / 10 GB
                  </span>
                </div>
                <ProgressBar value={24} color="primary" />
                <span style={{ fontSize: 11, color: themeVars.color.textMuted }}>
                  316개 파일 · 무료 한도의 24%
                </span>
              </div>
            </Widget>

            <Widget title="활동 많은 사용자">
              <div>
                {TOP_USERS.map((u, i) => (
                  <div
                    key={u.name}
                    style={{
                      ...userRow,
                      borderBottom:
                        i === TOP_USERS.length - 1 ? "none" : userRow.borderBottom,
                    }}
                  >
                    <Avatar initials={u.name[0]} size="sm" color="primary" />
                    <div>
                      <div style={userName}>{u.name}</div>
                      <div style={userRole}>{u.role}</div>
                    </div>
                    <span style={userCount}>{u.contracts}</span>
                  </div>
                ))}
              </div>
            </Widget>
          </div>
        </div>

        {/* 하단: 다가오는 만료 계약 */}
        <Widget title="만료 임박 계약" badge={3}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <ScheduleItem
              date="2026.07.05"
              title="IDC 입주 계약 (한라산 EV)"
              body="계약기간 만료 6일 전 · 갱신 검토 필요"
            />
            <ScheduleItem
              date="2026.07.12"
              title="SW 유지보수 용역 계약"
              body="계약기간 만료 13일 전 · 자동 갱신 조항 확인"
            />
            <ScheduleItem
              date="2026.07.20"
              title="데이터센터 임대차 계약"
              body="계약기간 만료 21일 전"
            />
          </div>
        </Widget>
      </div>
    </AdminShell>
  );
}
