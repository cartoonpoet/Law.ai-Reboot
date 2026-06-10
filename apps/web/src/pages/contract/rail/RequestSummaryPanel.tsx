import { useFormContext, useWatch } from "react-hook-form";
import { Card } from "@lawkit/ui";
import type { ContractRequestForm } from "../request-schema";
import * as css from "../contractRequest.css";

export function RequestSummaryPanel() {
  const { control } = useFormContext<ContractRequestForm>();
  const v = useWatch({ control }) as ContractRequestForm;
  const rows: [string, string][] = [
    ["계약 단계", v.stage === "new" ? "신규계약" : "변경·해지"],
    ["유형", v.ctype === "normal" ? "일반 검토요청" : "표준계약서 계약체결"],
    ["요청자", v.requester || "—"],
    ["계약서", v.contractFiles?.length ? `첨부 ${v.contractFiles.length}건` : "미첨부"],
  ];
  return (
    <Card bordered header="요청 요약">
      {rows.map(([k, val]) => (
        <div key={k} className={css.dkv}><span className={css.dkvKey}>{k}</span><span className={css.dkvVal}>{val}</span></div>
      ))}
    </Card>
  );
}
