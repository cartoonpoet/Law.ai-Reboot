import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { ContractStatus } from "@lawai/contracts";
import { listContracts } from "../../../api/contracts";
import { toListRow } from "../toListRow";
import { getGroupStatuses, type StatusGroup } from "../statusGroups";

const PAGE_SIZE = 20;

export type ContractExpiryFilter = "" | "d90" | "d180" | "expired";

// 계약 목록: 검색·상태(그룹+세부)·만료·내업무 필터 + 페이지네이션. 필터 변경 시 1페이지로.
export const useContractsList = () => {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<ContractStatus | "">("");
  const [group, setGroup] = useState<StatusGroup>("all");
  const [expiry, setExpiry] = useState<ContractExpiryFilter>("");
  const [party, setParty] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [mine, setMine] = useState(false);
  const [page, setPage] = useState(1);

  const { data, isFetching } = useQuery({
    // 목록 화면의 주 데이터 — 첫 조회 실패는 오류 페이지, 필터 변경 후 재조회 실패는 토스트.
    meta: { errorMode: "page" },
    queryKey: ["contracts", { q, status, group, expiry, party, categoryId, mine, page }],
    queryFn: () =>
      listContracts({
        q: q || undefined,
        status: status || undefined,
        statuses: status ? undefined : getGroupStatuses(group).join(",") || undefined,
        expiry: expiry || undefined,
        party: party || undefined,
        categoryId: categoryId || undefined,
        mine,
        page,
        pageSize: PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  });

  const changeQ = (next: string) => {
    setQ(next);
    setPage(1);
  };
  const changeStatus = (next: ContractStatus | "") => {
    setStatus(next);
    setPage(1);
  };
  // 그룹이 바뀌면 세부 상태 선택을 버린다(effect 로 동기화하지 않고 핸들러에서 직접 처리).
  const changeGroup = (next: StatusGroup): void => {
    setGroup(next);
    setStatus("");
    setPage(1);
  };
  const changeExpiry = (next: ContractExpiryFilter): void => {
    setExpiry(next);
    setPage(1);
  };
  const changeParty = (next: string) => {
    setParty(next);
    setPage(1);
  };
  const changeCategoryId = (next: string) => {
    setCategoryId(next);
    setPage(1);
  };
  const changeMine = (next: boolean) => {
    setMine(next);
    setPage(1);
  };

  const rows = (data?.items ?? []).map(toListRow);
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return {
    rows,
    total,
    totalPages,
    page,
    setPage,
    q,
    changeQ,
    status,
    changeStatus,
    group,
    changeGroup,
    expiry,
    changeExpiry,
    party,
    changeParty,
    categoryId,
    changeCategoryId,
    mine,
    changeMine,
    isFetching,
  };
};
