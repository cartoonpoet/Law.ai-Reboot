import { useFieldArray, useFormContext } from "react-hook-form";
import { Card, Avatar, Button, themeVars } from "@lawkit/ui";
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
        <Button type="button" variant="outline" color="secondary" size="small" onClick={() => append({ name: "신규", role: "결재 · 미지정" })}>
          + 결재자 추가
        </Button>
      </div>
    </Card>
  );
}
