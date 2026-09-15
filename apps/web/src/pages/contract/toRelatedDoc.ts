import type { ContractSummary } from "@lawai/contracts";
import type { RelatedDoc } from "../../api/relatedDocs";
import { getStatusLabel } from "./contractStatus";

// 계약 목록 요약 → 관련문서 한 건. 보조 정보는 관리번호·상태·상대방, 날짜는 체결일(없으면 최근 수정일).
export const toRelatedDoc = (contract: ContractSummary): RelatedDoc => ({
  id: contract.id,
  name: contract.title,
  category: "contract",
  sub: [contract.code, getStatusLabel(contract.status), contract.counterpartyName]
    .filter((part): part is string => Boolean(part))
    .join(" · "),
  date: (contract.signedAt ?? contract.updatedAt).slice(0, 10),
});
