import { useFieldArray, useFormContext } from "react-hook-form";
import { Card, Avatar, themeVars } from "@lawkit/ui";
import type { ContractRequestForm } from "../request-schema";

export function ApprovalLinePanel() {
  const { control } = useFormContext<ContractRequestForm>();
  const { fields, append } = useFieldArray({ control, name: "approvers" });
  return (
    <Card bordered header="결재선">
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {fields.map((f, i) => (
          <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 16, fontSize: 11, fontWeight: 800, color: themeVars.color.textMuted, textAlign: "center" }}>{i + 1}</span>
            <Avatar initials={f.name[0]} color="primary" size="sm" />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: themeVars.color.textHeading }}>{f.name}</div>
              <div style={{ fontSize: 11, color: themeVars.color.textMuted }}>{f.role}</div>
            </div>
          </div>
        ))}
        <button type="button" onClick={() => append({ name: "신규", role: "결재 · 미지정" })}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, border: `1px dashed ${themeVars.color.neutralBorderStrong}`, borderRadius: 8, padding: 9, fontSize: 12.5, fontWeight: 600, color: themeVars.color.textMuted, background: "none", cursor: "pointer", fontFamily: "inherit" }}>
          + 결재자 추가
        </button>
      </div>
    </Card>
  );
}
