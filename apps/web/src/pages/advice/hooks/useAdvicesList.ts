import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { AdviceStatusTypes } from "@lawai/contracts";
import { listAdvices } from "../../../api/advices";
import { getGroupStatuses, type AdviceGroupTypes } from "../adviceMeta";

const PAGE_SIZE = 20;

export const ADVICES_QUERY_KEY = "advices";

// 자문 목록: 검색·분류·그룹(+세부 상태)·내 업무 필터 + 페이지. 조건이 바뀌면 1페이지로.
export const useAdvicesList = () => {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [group, setGroup] = useState<AdviceGroupTypes>("all");
  const [status, setStatus] = useState<AdviceStatusTypes | "">("");
  const [isMine, setIsMine] = useState(false);
  const [page, setPage] = useState(1);

  const statuses = status ? [status] : getGroupStatuses(group);

  const { data, isFetching } = useQuery({
    // 목록 화면의 주 데이터 — 첫 조회 실패는 오류 페이지, 이후 재조회 실패는 토스트.
    meta: { errorMode: "page" },
    queryKey: [ADVICES_QUERY_KEY, { q, category, group, status, isMine, page }],
    queryFn: () =>
      listAdvices({
        q: q || undefined,
        category: category || undefined,
        statuses: statuses.join(",") || undefined,
        mine: isMine,
        page,
        pageSize: PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  });

  const resetPage = <T,>(apply: (next: T) => void) => (next: T) => {
    apply(next);
    setPage(1);
  };

  // 그룹이 바뀌면 세부 상태 선택을 버린다(effect 가 아니라 핸들러에서 처리).
  const changeGroup = (next: AdviceGroupTypes) => {
    setGroup(next);
    setStatus("");
    setPage(1);
  };

  const total = data?.total ?? 0;
  const counts = data?.counts;
  const getGroupCount = (value: AdviceGroupTypes): number | null => {
    if (!counts) return null;
    const groupStatuses = getGroupStatuses(value);
    const targets = groupStatuses.length > 0 ? groupStatuses : (Object.keys(counts) as AdviceStatusTypes[]);
    return targets.reduce((sum, key) => sum + counts[key], 0);
  };

  return {
    advices: data?.items ?? [],
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    page,
    setPage,
    q,
    changeQ: resetPage(setQ),
    category,
    changeCategory: resetPage(setCategory),
    group,
    changeGroup,
    groupStatuses: getGroupStatuses(group),
    status,
    changeStatus: resetPage(setStatus),
    isMine,
    changeMine: resetPage(setIsMine),
    getGroupCount,
    isFetching,
  };
};
