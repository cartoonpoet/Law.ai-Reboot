import { useState } from "react";
import { keepPreviousData, useQueries, useQuery } from "@tanstack/react-query";
import { listContracts } from "../../../api/contracts";

export type ExpiringTabTypes = "d7" | "d30" | "d90" | "expired";

export const EXPIRING_TABS: { value: ExpiringTabTypes; label: string }[] = [
  { value: "d7", label: "7일 안" },
  { value: "d30", label: "30일 안" },
  { value: "d90", label: "90일 안" },
  { value: "expired", label: "지난 만료" },
];

// 만료를 챙길 계약 — 체결 완료·계약 이행(종료된 계약은 제외).
const ACTIVE_STATUSES = "signed,fulfilling";
// 한 탭에 보여줄 최대 건수(만료가 가까운 순).
export const EXPIRING_PAGE_SIZE = 50;
// "contracts" 로 시작해 상태 변경·해지 뒤 목록 무효화에 함께 걸린다.
const EXPIRING_QUERY_ROOT = ["contracts", "expiring"] as const;

const fetchWindow = (expiry: ExpiringTabTypes, pageSize: number) =>
  listContracts({ statuses: ACTIVE_STATUSES, expiry, sort: "periodEnd", pageSize });

/** 만료 관리 — 선택한 기간의 계약 목록 + 기간별 건수. */
export const useExpiringContracts = () => {
  const [tab, setTab] = useState<ExpiringTabTypes>("d7");

  const listQuery = useQuery({
    queryKey: [...EXPIRING_QUERY_ROOT, "list", tab],
    queryFn: () => fetchWindow(tab, EXPIRING_PAGE_SIZE),
    placeholderData: keepPreviousData,
    // 화면의 주 데이터 — 첫 조회 실패는 오류 페이지.
    meta: { errorMode: "page" },
  });

  // 건수는 한 건만 받아 total 로 센다(보조 정보라 실패해도 조용히).
  const countQueries = useQueries({
    queries: EXPIRING_TABS.map((option) => ({
      queryKey: [...EXPIRING_QUERY_ROOT, "count", option.value],
      queryFn: () => fetchWindow(option.value, 1),
      meta: { errorMode: "silent" as const },
    })),
  });

  const counts = Object.fromEntries(
    EXPIRING_TABS.map((option, i) => [option.value, countQueries[i].data?.total ?? null]),
  ) as Record<ExpiringTabTypes, number | null>;

  return {
    tab,
    setTab,
    contracts: listQuery.data?.items ?? [],
    total: listQuery.data?.total ?? 0,
    isLoading: listQuery.isLoading,
    counts,
  };
};
