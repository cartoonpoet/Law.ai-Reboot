import {
  Avatar,
  Button,
  Icon,
  ProgressBar,
  themeVars,
  Widget,
} from "@lawkit/ui";
import { AdminShell } from "../../components/AdminShell";
import { useCountUp } from "../../components/dashboard/useCountUp";
import { Sparkline } from "../../components/dashboard/Sparkline";

// ========== mock 데이터 (멀티컴퍼니 SaaS 운영 관점) ==========

interface CompanyRow {
  id: string;
  name: string;
  initial: string;
  color: "primary" | "success" | "warning" | "danger" | "secondary";
  plan: "Enterprise" | "Pro" | "Starter";
  contracts: number;
  users: number;
  status: "active" | "trial" | "suspended";
  trend: number[];
}

const COMPANIES: CompanyRow[] = [
  { id: "c1", name: "삼성SDS 법무팀", initial: "S", color: "primary", plan: "Enterprise", contracts: 412, users: 48, status: "active", trend: [20, 24, 22, 30, 28, 35, 42] },
  { id: "c2", name: "LG CNS", initial: "L", color: "danger", plan: "Enterprise", contracts: 318, users: 36, status: "active", trend: [30, 28, 32, 30, 34, 33, 38] },
  { id: "c3", name: "네이버 클라우드", initial: "N", color: "success", plan: "Pro", contracts: 247, users: 29, status: "active", trend: [15, 18, 22, 20, 26, 30, 31] },
  { id: "c4", name: "카카오엔터프라이즈", initial: "K", color: "warning", plan: "Pro", contracts: 198, users: 24, status: "active", trend: [22, 20, 18, 24, 26, 25, 27] },
  { id: "c5", name: "쿠팡 리걸", initial: "C", color: "secondary", plan: "Pro", contracts: 156, users: 19, status: "trial", trend: [5, 8, 12, 18, 24, 30, 38] },
  { id: "c6", name: "우아한형제들", initial: "우", color: "primary", plan: "Starter", contracts: 89, users: 11, status: "active", trend: [40, 38, 35, 30, 28, 24, 20] },
  { id: "c7", name: "토스 법무", initial: "T", color: "success", plan: "Starter", contracts: 64, users: 8, status: "suspended", trend: [30, 25, 20, 15, 10, 6, 3] },
];

const ACTIVITY = [
  { company: "삼성SDS 법무팀", actor: "김법무", action: "비교 보고서 다운로드", at: "방금", kind: "report" as const },
  { company: "쿠팡 리걸", actor: "이변호", action: "신규 계약 등록", at: "2분 전", kind: "contract" as const },
  { company: "네이버 클라우드", actor: "박담당", action: "사용자 5명 초대", at: "8분 전", kind: "user" as const },
  { company: "LG CNS", actor: "최법무", action: "계약 상태전이", at: "15분 전", kind: "transition" as const },
  { company: "카카오엔터프라이즈", actor: "정담당", action: "파일 업로드", at: "23분 전", kind: "file" as const },
];

const ATTENTION = [
  { company: "쿠팡 리걸", initial: "C", color: "secondary" as const, reason: "Trial 만료 3일 전", level: "warning" as const },
  { company: "토스 법무", initial: "T", color: "success" as const, reason: "30일간 활동 없음 · 일시중지", level: "danger" as const },
  { company: "우아한형제들", initial: "우", color: "primary" as const, reason: "사용량 80% 도달", level: "warning" as const },
];

// 월별 신규 가입 추이
const SIGNUPS = [2, 3, 1, 4, 3, 5, 4, 6, 5, 7, 6, 8];
const SIGNUP_MONTHS = ["7", "8", "9", "10", "11", "12", "1", "2", "3", "4", "5", "6"];

const PLAN_COLOR: Record<CompanyRow["plan"], string> = {
  Enterprise: "#6366f1",
  Pro: "#3b82f6",
  Starter: "#64748b",
};

const STATUS_META: Record<CompanyRow["status"], { label: string; color: string; bg: string; live?: boolean }> = {
  active: { label: "활성", color: "#16a34a", bg: "#f0fdf4", live: true },
  trial: { label: "체험", color: "#d97706", bg: "#fffbeb" },
  suspended: { label: "중지", color: "#dc2626", bg: "#fef2f2" },
};

const ACTIVITY_ICON: Record<string, { icon: "fileCompare" | "filePlus" | "userPlus" | "refreshCw" | "paperclip"; bg: string }> = {
  report: { icon: "fileCompare", bg: "#eff6ff" },
  contract: { icon: "filePlus", bg: "#f0fdf4" },
  user: { icon: "userPlus", bg: "#f5f3ff" },
  transition: { icon: "refreshCw", bg: "#fffbeb" },
  file: { icon: "paperclip", bg: "#f1f5f9" },
};

// ========== 스타일 ==========

const wrap: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 16, maxWidth: 1280 };

const pageHead: React.CSSProperties = { display: "flex", alignItems: "flex-end", justifyContent: "space-between" };
const pageTitle: React.CSSProperties = { fontSize: 22, fontWeight: 800, color: themeVars.color.textHeading, margin: 0, letterSpacing: -0.4 };
const pageSub: React.CSSProperties = { fontSize: 13, color: themeVars.color.textMuted, margin: "4px 0 0", display: "flex", alignItems: "center", gap: 8 };

const kpiGrid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 };
const kpiCard: React.CSSProperties = {
  position: "relative",
  background: themeVars.color.neutralSurface,
  border: `1px solid ${themeVars.color.neutralBorder}`,
  borderRadius: 10,
  padding: 16,
  overflow: "hidden",
};
const kpiTop: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 };
const kpiLabel: React.CSSProperties = { fontSize: 12, color: themeVars.color.textMuted, fontWeight: 600 };
const kpiIconBox: React.CSSProperties = { width: 30, height: 30, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" };
const kpiValue: React.CSSProperties = { fontSize: 30, fontWeight: 800, color: themeVars.color.textHeading, letterSpacing: -0.8, lineHeight: 1, fontVariantNumeric: "tabular-nums" };
const kpiDelta = (up: boolean): React.CSSProperties => ({ fontSize: 11, fontWeight: 700, color: up ? "#16a34a" : "#dc2626", marginTop: 6, display: "inline-flex", alignItems: "center", gap: 3 });

const twoCol: React.CSSProperties = { display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: 16, alignItems: "start" };

const table: React.CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: 13 };
const th: React.CSSProperties = { textAlign: "left", fontSize: 11, fontWeight: 700, color: themeVars.color.textMuted, padding: "0 10px 8px", textTransform: "uppercase", letterSpacing: 0.4 };
const td: React.CSSProperties = { padding: "10px", borderTop: `1px solid ${themeVars.color.neutralBorder}`, verticalAlign: "middle" };
const companyCell: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10 };
const companyName: React.CSSProperties = { fontWeight: 600, color: themeVars.color.textHeading };
const planPill = (plan: CompanyRow["plan"]): React.CSSProperties => ({ fontSize: 11, fontWeight: 700, color: PLAN_COLOR[plan], background: `${PLAN_COLOR[plan]}14`, padding: "2px 8px", borderRadius: 999 });
const statusPill = (s: CompanyRow["status"]): React.CSSProperties => ({ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: STATUS_META[s].color, background: STATUS_META[s].bg, padding: "3px 9px", borderRadius: 999 });
const statusDot = (s: CompanyRow["status"]): React.CSSProperties => ({ width: 6, height: 6, borderRadius: 999, background: STATUS_META[s].color });
const numCell: React.CSSProperties = { fontWeight: 700, color: themeVars.color.textHeading, fontVariantNumeric: "tabular-nums" };

const feedRow: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: `1px solid ${themeVars.color.neutralBorder}` };
const feedIcon: React.CSSProperties = { width: 30, height: 30, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 };
const feedMain: React.CSSProperties = { flex: 1, minWidth: 0 };
const feedCompany: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: themeVars.color.accentPrimary };
const feedAction: React.CSSProperties = { fontSize: 12.5, color: themeVars.color.textHeading };
const feedTime: React.CSSProperties = { fontSize: 11, color: themeVars.color.textMuted, flexShrink: 0, fontVariantNumeric: "tabular-nums" };

const attentionRow: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: `1px solid ${themeVars.color.neutralBorder}` };
const attentionMain: React.CSSProperties = { flex: 1, minWidth: 0 };
const attReason = (level: "warning" | "danger"): React.CSSProperties => ({ fontSize: 11.5, color: level === "danger" ? "#dc2626" : "#d97706", fontWeight: 600 });

const chartWrap: React.CSSProperties = { display: "flex", alignItems: "flex-end", gap: 6, height: 120, padding: "8px 4px 0" };
const chartCol: React.CSSProperties = { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 };
const chartMonth: React.CSSProperties = { fontSize: 10, color: themeVars.color.textMuted };

const healthRow: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8, padding: "8px 0", fontSize: 13 };

// ========== KPI 카드 ==========

function Kpi({
  label,
  target,
  prefix,
  suffix,
  delta,
  up,
  icon,
  iconColor,
  iconBg,
  spark,
  delay,
}: {
  label: string;
  target: number;
  prefix?: string;
  suffix?: string;
  delta: string;
  up: boolean;
  icon: "officialDocu" | "users" | "fileText" | "barChart";
  iconColor: string;
  iconBg: string;
  spark: number[];
  delay: number;
}) {
  const val = useCountUp(target);
  return (
    <div className="lawai-kpi-pop" style={{ ...kpiCard, animationDelay: `${delay}ms` }}>
      <div className="lawai-shimmer" style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />
      <div style={{ position: "relative" }}>
        <div style={kpiTop}>
          <span style={kpiLabel}>{label}</span>
          <span style={{ ...kpiIconBox, background: iconBg, color: iconColor }}>
            <Icon name={icon} size="sm" />
          </span>
        </div>
        <div style={kpiValue}>
          {prefix}
          {val.toLocaleString()}
          {suffix}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={kpiDelta(up)}>
            <Icon name={up ? "barChart" : "barChart"} size="sm" /> {delta}
          </span>
          <Sparkline data={spark} color={iconColor} />
        </div>
      </div>
    </div>
  );
}

export function DashboardMock() {
  return (
    <AdminShell
      breadcrumbLabel="운영 대시보드"
      topbarExtra={
        <div style={{ display: "flex", gap: 8 }}>
          <Button size="small" variant="outline" iconLeft={<Icon name="filterList" size="sm" />}>
            기간
          </Button>
          <Button size="small" variant="outline" iconLeft={<Icon name="refreshCw" size="sm" />}>
            새로고침
          </Button>
        </div>
      }
    >
      <div style={wrap}>
        <div style={pageHead}>
          <div>
            <h1 style={pageTitle}>멀티 컴퍼니 운영 대시보드</h1>
            <p style={pageSub}>
              <span className="lawai-status-live" style={{ width: 7, height: 7, borderRadius: 999, background: "#22c55e", display: "inline-block" }} />
              24개 고객사 실시간 모니터링 · 손준호 님
            </p>
          </div>
        </div>

        {/* 전사 통합 KPI */}
        <div style={kpiGrid}>
          <Kpi label="고객사" target={24} delta="+3 이번 달" up icon="officialDocu" iconColor="#6366f1" iconBg="#eef2ff" spark={[14, 16, 17, 19, 20, 22, 24]} delay={0} />
          <Kpi label="전체 계약" target={1847} delta="+128 (7d)" up icon="fileText" iconColor="#3b82f6" iconBg="#eff6ff" spark={[1500, 1580, 1640, 1700, 1760, 1810, 1847]} delay={80} />
          <Kpi label="전체 사용자" target={312} delta="+24 (7d)" up icon="users" iconColor="#16a34a" iconBg="#f0fdf4" spark={[260, 270, 282, 290, 298, 305, 312]} delay={160} />
          <Kpi label="월 매출 (MRR)" target={48} prefix="₩" suffix="M" delta="+12% MoM" up icon="barChart" iconColor="#d97706" iconBg="#fffbeb" spark={[32, 35, 38, 41, 43, 46, 48]} delay={240} />
        </div>

        <div style={twoCol}>
          {/* 좌: 고객사 목록 + 가입 추이 */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Widget
              title="고객사"
              badge={COMPANIES.length}
              extra={
                <Button size="small" variant="outline">
                  전체 보기
                </Button>
              }
            >
              <table style={table}>
                <thead>
                  <tr>
                    <th style={th}>회사</th>
                    <th style={th}>플랜</th>
                    <th style={{ ...th, textAlign: "right" }}>계약</th>
                    <th style={{ ...th, textAlign: "right" }}>사용자</th>
                    <th style={th}>추세</th>
                    <th style={th}>상태</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPANIES.map((c) => (
                    <tr key={c.id} className="lawai-row-hover">
                      <td style={td}>
                        <div style={companyCell}>
                          <Avatar initials={c.initial} size="sm" color={c.color} />
                          <span style={companyName}>{c.name}</span>
                        </div>
                      </td>
                      <td style={td}>
                        <span style={planPill(c.plan)}>{c.plan}</span>
                      </td>
                      <td style={{ ...td, textAlign: "right", ...numCell }}>{c.contracts}</td>
                      <td style={{ ...td, textAlign: "right", ...numCell }}>{c.users}</td>
                      <td style={td}>
                        <Sparkline data={c.trend} width={64} height={20} />
                      </td>
                      <td style={td}>
                        <span style={statusPill(c.status)}>
                          <span
                            className={STATUS_META[c.status].live ? "lawai-status-live" : undefined}
                            style={statusDot(c.status)}
                          />
                          {STATUS_META[c.status].label}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Widget>

            <Widget title="고객사 가입 추이" extra={<span style={{ fontSize: 12, color: themeVars.color.textMuted }}>최근 12개월</span>}>
              <div style={chartWrap}>
                {SIGNUPS.map((v, i) => {
                  const maxV = Math.max(...SIGNUPS);
                  return (
                    <div key={i} style={chartCol}>
                      <div
                        className="lawai-bar"
                        style={{
                          width: "100%",
                          maxWidth: 22,
                          height: `${(v / maxV) * 88}px`,
                          background:
                            i === SIGNUPS.length - 1
                              ? "linear-gradient(180deg, #6366f1, #3b82f6)"
                              : "#dbeafe",
                          borderRadius: "4px 4px 0 0",
                          animationDelay: `${i * 50}ms`,
                        }}
                      />
                      <span style={chartMonth}>{SIGNUP_MONTHS[i]}월</span>
                    </div>
                  );
                })}
              </div>
            </Widget>
          </div>

          {/* 우: 실시간 활동 + 주의 필요 + 시스템 상태 */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Widget
              title="실시간 활동"
              extra={
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: "#16a34a", fontWeight: 700 }}>
                  <span className="lawai-status-live" style={{ width: 6, height: 6, borderRadius: 999, background: "#22c55e" }} />
                  LIVE
                </span>
              }
            >
              <div>
                {ACTIVITY.map((a, i) => {
                  const m = ACTIVITY_ICON[a.kind];
                  return (
                    <div
                      key={i}
                      className="lawai-feed-item"
                      style={{
                        ...feedRow,
                        borderBottom: i === ACTIVITY.length - 1 ? "none" : feedRow.borderBottom,
                        animationDelay: `${i * 90}ms`,
                      }}
                    >
                      <div style={{ ...feedIcon, background: m.bg }}>
                        <Icon name={m.icon} size="sm" />
                      </div>
                      <div style={feedMain}>
                        <div style={feedCompany}>{a.company}</div>
                        <div style={feedAction}>
                          {a.actor} · {a.action}
                        </div>
                      </div>
                      <span style={feedTime}>{a.at}</span>
                    </div>
                  );
                })}
              </div>
            </Widget>

            <Widget title="주의 필요 고객사" badge={ATTENTION.length}>
              <div>
                {ATTENTION.map((a, i) => (
                  <div
                    key={i}
                    style={{
                      ...attentionRow,
                      borderBottom: i === ATTENTION.length - 1 ? "none" : attentionRow.borderBottom,
                    }}
                  >
                    <Avatar initials={a.initial} size="sm" color={a.color} />
                    <div style={attentionMain}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: themeVars.color.textHeading }}>
                        {a.company}
                      </div>
                      <div style={attReason(a.level)}>{a.reason}</div>
                    </div>
                    <Icon name="chevronRight" size="sm" />
                  </div>
                ))}
              </div>
            </Widget>

            <Widget title="시스템 상태">
              {["API 게이트웨이", "PostgreSQL", "Cloudflare R2"].map((s) => (
                <div key={s} style={healthRow}>
                  <span className="lawai-status-live" style={{ width: 8, height: 8, borderRadius: 999, background: "#22c55e" }} />
                  <span>{s}</span>
                  <span style={{ marginLeft: "auto", color: "#16a34a", fontWeight: 600 }}>정상</span>
                </div>
              ))}
              <div style={{ marginTop: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: themeVars.color.textSecondary }}>전체 R2 스토리지</span>
                  <span style={{ fontWeight: 700, color: themeVars.color.textHeading }}>18.4 / 50 GB</span>
                </div>
                <ProgressBar value={37} color="primary" />
              </div>
            </Widget>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
