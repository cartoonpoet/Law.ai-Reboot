import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Avatar, Icon, Spinner, themeVars } from "@lawkit/ui";
import type { AdminTenantListItem } from "@lawai/contracts";
import { AdminShell } from "../../components/AdminShell";
import { listAdminTenants } from "../../api/adminTenants";
import {
  PLAN_LABELS,
  STATUS_LABELS,
  formatRelative,
  getTrialDday,
} from "./tenantLabels";

const kpiGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: 12,
  marginBottom: 16,
};
const kpiCard: React.CSSProperties = {
  background: themeVars.color.neutralSurface,
  border: `1px solid ${themeVars.color.neutralBorder}`,
  borderRadius: 8,
  padding: "14px 16px",
};
const kpiLabel: React.CSSProperties = {
  fontSize: 11.5,
  fontWeight: 700,
  color: themeVars.color.textSecondary,
};
const kpiValue: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 800,
  color: themeVars.color.textHeading,
  marginTop: 4,
};
const tableWrap: React.CSSProperties = {
  background: themeVars.color.neutralSurface,
  border: `1px solid ${themeVars.color.neutralBorder}`,
  borderRadius: 8,
  overflow: "hidden",
};
const th: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 14px",
  fontSize: 11,
  fontWeight: 700,
  color: themeVars.color.textSecondary,
  borderBottom: `1px solid ${themeVars.color.neutralBorder}`,
  background: themeVars.color.neutralSurfaceAlt,
};
const td: React.CSSProperties = {
  padding: "11px 14px",
  borderBottom: `1px solid ${themeVars.color.neutralBorder}`,
  fontSize: 12.5,
  color: themeVars.color.textPrimary,
};

export function TenantListPage() {
  const navigate = useNavigate();
  const query = useQuery({ queryKey: ["adminTenants"], queryFn: listAdminTenants });

  if (query.isLoading) {
    return (
      <AdminShell breadcrumbLabel="고객사">
        <Spinner label="불러오는 중..." />
      </AdminShell>
    );
  }
  const data = query.data;
  if (!data) {
    return (
      <AdminShell breadcrumbLabel="고객사">
        <div style={{ color: themeVars.color.textSecondary }}>
          고객사 목록을 불러오지 못했습니다.
        </div>
      </AdminShell>
    );
  }

  const nearestTrial = data.tenants
    .filter((t) => t.status === "trial" && t.trialEndsAt)
    .sort((a, b) => a.trialEndsAt!.localeCompare(b.trialEndsAt!))[0];

  return (
    <AdminShell breadcrumbLabel="고객사">
      <div style={kpiGrid}>
        <div style={kpiCard}>
          <div style={kpiLabel}>전체 고객사</div>
          <div style={kpiValue}>{data.totals.tenants}</div>
        </div>
        <div style={kpiCard}>
          <div style={kpiLabel}>전체 사용자</div>
          <div style={kpiValue}>{data.totals.users}</div>
        </div>
        <div style={kpiCard}>
          <div style={kpiLabel}>전체 계약</div>
          <div style={kpiValue}>{data.totals.contracts}</div>
        </div>
        <div style={kpiCard}>
          <div style={kpiLabel}>체험판(전환 대기)</div>
          <div style={kpiValue}>{data.totals.trials}</div>
          {nearestTrial ? (
            <div style={{ fontSize: 11, color: themeVars.color.textSecondary, marginTop: 2 }}>
              {nearestTrial.name} · {getTrialDday(nearestTrial.trialEndsAt)}
            </div>
          ) : null}
        </div>
      </div>

      <div style={tableWrap}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>회사</th>
              <th style={th}>요금제</th>
              <th style={th}>상태</th>
              <th style={th}>멤버</th>
              <th style={th}>계약</th>
              <th style={th}>최근 활동</th>
              <th style={th} />
            </tr>
          </thead>
          <tbody>
            {data.tenants.map((t: AdminTenantListItem) => (
              <tr
                key={t.id}
                onClick={() => navigate(`/tenants/${t.id}`)}
                style={{ cursor: "pointer" }}
              >
                <td style={td}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      fontWeight: 700,
                      color: themeVars.color.textHeading,
                    }}
                  >
                    <Avatar initials={t.name.charAt(0)} size="sm" color="primary" />
                    {t.name}
                  </span>
                </td>
                <td style={td}>{PLAN_LABELS[t.plan]}</td>
                <td style={td}>
                  {STATUS_LABELS[t.status]}
                  {t.status === "trial" && t.trialEndsAt
                    ? ` · ${getTrialDday(t.trialEndsAt)}`
                    : ""}
                </td>
                <td style={td}>{t.memberCount}</td>
                <td style={td}>{t.contractCount}</td>
                <td style={td}>{formatRelative(t.lastActivityAt)}</td>
                <td style={td}>
                  <Icon name="chevronRight" size="sm" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
