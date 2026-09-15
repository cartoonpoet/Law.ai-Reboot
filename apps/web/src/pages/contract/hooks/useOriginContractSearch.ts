import type { ContractSummary } from "@lawai/contracts";
import { listContracts } from "../../../api/contracts";
import { useSearchQuery } from "./useSearchQuery";

// 원 계약 후보 — 갱신·변경·해지할 수 있는 체결 완료·계약 이행 계약만.
const ORIGIN_CANDIDATE_STATUSES = "signed,fulfilling";
const CANDIDATE_LIMIT = 10;

const fetchOriginCandidates = async (query: string): Promise<ContractSummary[]> => {
  const { items } = await listContracts({ q: query, statuses: ORIGIN_CANDIDATE_STATUSES, pageSize: CANDIDATE_LIMIT });
  return items;
};

// 계약명·관리번호 키워드로 원 계약 후보를 찾는다(입력 debounce + 키워드별 캐시).
export const useOriginContractSearch = () => useSearchQuery("originContractCandidates", fetchOriginCandidates);
