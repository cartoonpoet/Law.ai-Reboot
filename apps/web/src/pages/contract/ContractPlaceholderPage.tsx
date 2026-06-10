import { T } from "../../design/tokens";

export function ContractPlaceholderPage({ title = "계약" }: { title?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 440, textAlign: "center", color: T.faint }}>
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: T.body }}>{title}</h2>
      <p style={{ margin: "8px 0 0", fontSize: 13.5 }}>이 화면은 다음 단계에서 제작합니다.</p>
    </div>
  );
}
