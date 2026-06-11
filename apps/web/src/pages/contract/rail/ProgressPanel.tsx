import { useFormContext, useWatch } from "react-hook-form";
import { Card, Icon, themeVars } from "@lawkit/ui";
import type { ContractRequestForm } from "../request-schema";
import { deriveSectionStatus, requiredTotals } from "../sectionStatus";
import type { SectionState } from "../sectionStatus";
import * as css from "../contractRequest.css";

export function ProgressPanel() {
  const { control } = useFormContext<ContractRequestForm>();
  const values = useWatch({ control }) as ContractRequestForm;
  const sections = deriveSectionStatus(values);
  const { total, done } = requiredTotals(sections);
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  const renderDot = (status: SectionState) => {
    if (status === "done")
      return <span className={css.prgDot} style={{ background: themeVars.color.accentSuccess }}><Icon name="check" size="sm" style={{ width: 12, height: 12, color: themeVars.color.textHeading }} /></span>;
    if (status === "partial")
      return <span className={css.prgDot} style={{ border: `2px solid ${themeVars.color.accentWarning}` }}><span style={{ width: 7, height: 7, borderRadius: 999, background: themeVars.color.accentWarning }} /></span>;
    return <span className={css.prgDot} style={{ border: `2px solid ${themeVars.color.neutralBorderStrong}` }} />;
  };

  const header = (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <Icon name="factCheck" size="sm" style={{ width: 15, height: 15, color: themeVars.color.textMuted }} />
      작성 현황
    </span>
  );

  return (
    <Card bordered header={header}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 26, fontWeight: 800, color: themeVars.color.accentPrimary }}>{pct}<small style={{ fontSize: 13, color: themeVars.color.textMuted }}>%</small></span>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: themeVars.color.textSecondary }}>필수 {done} / {total}</span>
      </div>
      <div style={{ height: 7, borderRadius: 99, background: themeVars.color.neutralSurfaceAlt, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: themeVars.color.accentPrimary }} />
      </div>
      <div style={{ marginTop: 8 }}>
        {sections.map((sct) => (
          <div key={sct.id} className={css.prgRow}>
            {renderDot(sct.status)}
            <span className={css.prgLabel} style={sct.status === "empty" ? { color: themeVars.color.textMuted, fontWeight: 600 } : undefined}>{sct.label}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: sct.status === "done" ? themeVars.color.accentSuccess : sct.optional ? themeVars.color.textMuted : themeVars.color.accentWarning }}>
              {sct.optional ? "선택" : sct.status === "done" ? `${sct.requiredDone}/${sct.requiredTotal}` : `${sct.requiredTotal - sct.requiredDone} 남음`}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
