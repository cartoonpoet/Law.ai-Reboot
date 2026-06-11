import { useFormContext, useWatch } from "react-hook-form";
import { Card, Icon, themeVars } from "@lawkit/ui";
import type { ContractRequestForm } from "../request-schema";
import { getPrecheck } from "../aiPrecheck";
import * as css from "../contractRequest.css";

export function AiPrecheckPanel() {
  const { control } = useFormContext<ContractRequestForm>();
  const files = useWatch({ control, name: "contractFiles" }) ?? [];
  const result = getPrecheck(files.length > 0);

  const header = (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, width: "100%" }}>
      <Icon name="autoAwesome" size="sm" style={{ width: 15, height: 15, color: themeVars.color.accentPrimary }} />
      AI 사전 점검
      {result.analyzed && <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 800, color: themeVars.color.accentDanger }}>고위험 {result.highCount} · 총 {result.risks.length}건</span>}
    </span>
  );

  return (
    <Card bordered header={header}>
      {!result.analyzed ? (
        <div style={{ fontSize: 12, color: themeVars.color.textMuted, lineHeight: 1.6 }}>계약서를 첨부하면 AI가 주요 리스크 조항을 사전 점검합니다.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {result.risks.map((r) => (
            <div key={r.clause} className={css.drisk}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ fontSize: 10, fontWeight: 800, padding: "1px 7px", borderRadius: 4, color: r.level === "high" ? themeVars.color.accentDanger : themeVars.color.accentWarning, border: `1px solid ${r.level === "high" ? themeVars.color.accentDanger : themeVars.color.accentWarning}` }}>
                  {r.level === "high" ? "고위험" : "주의"}
                </span>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: themeVars.color.textHeading }}>{r.clause}</span>
              </div>
              <div style={{ fontSize: 11.5, color: themeVars.color.textSecondary, marginTop: 5 }}>{r.finding}</div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
