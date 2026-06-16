import { themeVars } from "@lawkit/ui";
import type { Company } from "@lawai/contracts";

const tint = (color: string, pct: number) => `color-mix(in srgb, ${color} ${pct}%, white)`;

const BuildingIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h.01M9 13h.01M9 17h.01M15 9h.01M15 13h.01M15 17h.01" />
  </svg>
);
const PersonIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
  </svg>
);
const CheckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, color: themeVars.color.accentPrimary }}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const badgeStyle = (color: string): React.CSSProperties => ({
  fontSize: 10,
  fontWeight: 800,
  lineHeight: 1.5,
  padding: "1px 6px",
  borderRadius: 4,
  color,
  backgroundColor: tint(color, 14),
});

interface CompanyOptionRowProps {
  company: Company;
  selected: boolean;
}

/** 상대 계약자 검색 드롭다운의 리치 행(시안 디자인). 표시 전용 컴포넌트. */
export function CompanyOptionRow({ company, selected }: CompanyOptionRowProps) {
  const isIndividual = company.type === "individual";
  const isTempBizNo = company.bizNo.startsWith("TEMP-");
  const accent = isIndividual ? themeVars.color.accentInfo : themeVars.color.accentPrimary;

  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px" }}>
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: accent,
          backgroundColor: tint(accent, 12),
        }}
      >
        {isIndividual ? <PersonIcon /> : <BuildingIcon />}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: themeVars.color.textHeading }}>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{company.name}</span>
          <span style={badgeStyle(accent)}>{isIndividual ? "개인" : "회사"}</span>
        </div>
        <div style={{ fontSize: 11.5, color: themeVars.color.textMuted, marginTop: 3, lineHeight: 1.55 }}>
          <b style={{ color: themeVars.color.textSecondary }}>사업자</b>{" "}
          {isTempBizNo ? (
            <span style={badgeStyle(themeVars.color.accentWarning)}>임시번호 자동생성</span>
          ) : (
            company.bizNo
          )}{" "}
          · <b style={{ color: themeVars.color.textSecondary }}>대표</b> {company.ceo ?? "-"} ·{" "}
          <b style={{ color: themeVars.color.textSecondary }}>전화</b> {company.phone ?? "-"}
          <br />
          <b style={{ color: themeVars.color.textSecondary }}>주소</b> {company.address ?? "-"}
        </div>
      </div>

      {selected ? <CheckIcon /> : null}
    </div>
  );
}
