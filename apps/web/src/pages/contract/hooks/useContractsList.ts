import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { ContractStatus } from "@lawai/contracts";
import { listContracts } from "../../../api/contracts";
import { toListRow } from "../toListRow";

const PAGE_SIZE = 20;

// 계약 목록: 검색·상태·내업무 필터 + 페이지네이션. 필터 변경 시 1페이지로.
export const useContractsList = () => {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<ContractStatus | "">("");
  const [party, setParty] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [mine, setMine] = useState(false);
  const [page, setPage] = useState(1);

  const { data, isFetching } = useQuery({
    queryKey: ["contracts", { q, status, party, categoryId, mine, page }],
    queryFn: () =>
      listContracts({
        q: q || undefined,
        status: status || undefined,
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
    party,
    changeParty,
    categoryId,
    changeCategoryId,
    mine,
    changeMine,
    isFetching,
  };
};
