import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getErrorStatus } from "../../../api/apiError";
import type { CycleTimeTargetTypes } from "@lawai/contracts";
import { listTenantMembers } from "../../../api/members";
import { useNavPermission } from "../../../components/layout/hooks/useNavPermission";
import { MEMBERS_QUERY_KEY } from "../../members/useMembers";
import { DEFAULT_RANGE_PRESET, getPresetRange, type RangePresetTypes } from "../cycleTimeRange";
import { ALL_OWNERS, getOwnerOptions } from "../cycleTimeView";
import { createCycleTimeQuery } from "./cycleTimeQuery";

/**
 * 업무 통계 화면의 권한·필터(대상·기간·담당자)와 조회.
 * 볼 권한이 없으면 아예 조회하지 않는다(서버도 403 으로 막는다).
 */
export const useCycleTimeStats = () => {
  const [targetType, setTargetType] = useState<CycleTimeTargetTypes>("contract");
  const [preset, setPreset] = useState<RangePresetTypes>(DEFAULT_RANGE_PRESET);
  const [ownerId, setOwnerId] = useState(ALL_OWNERS);

  const permission = useNavPermission();
  const range = getPresetRange(preset, new Date());

  const query = useQuery({
    ...createCycleTimeQuery({ targetType, from: range.from, to: range.to, ownerId }),
    enabled: permission.canSeeStats,
    // 실패는 이 화면 안에서 안내로 보여준다(오류 페이지로 날리지 않는다) —
    // 필터를 바꾸다 한 번 실패했다고 보고 있던 숫자까지 사라지면 안 된다.
    meta: { errorMode: "silent" },
    // 필터를 바꿔도 이전 숫자를 두고 갈아치워 화면이 깜빡이지 않게.
    placeholderData: keepPreviousData,
  });

  // 담당자 후보. 실패하면 "담당자 전체"만 남는다.
  // 멤버 관리 화면과 키를 나눈다 — 거기는 실패를 오류 페이지로 보여주고 여기는 조용히 넘기므로,
  // 같은 키를 쓰면 캐시 meta 를 나중에 뜬 쪽이 덮어쓴다.
  const membersQuery = useQuery({
    queryKey: [...MEMBERS_QUERY_KEY, "statsOwnerOptions"] as const,
    queryFn: listTenantMembers,
    enabled: permission.canSeeStats,
    meta: { errorMode: "silent" },
  });

  return {
    canSee: permission.canSeeStats,
    isPermissionLoading: permission.isLoading,
    // 권한을 못 불러온 것과 통계를 못 불러온 것은 화면에서 다르게 안내한다.
    isPermissionError: permission.isError,
    retryPermission: permission.retry,
    isError: query.isError,
    // 서버가 막은 경우(화면 판정과 서버 판정이 어긋난 순간) — 다시 시도해도 소용없으니 권한 안내로 보낸다.
    isForbidden: getErrorStatus(query.error) === 403,
    retry: () => void query.refetch(),
    targetType,
    changeTargetType: setTargetType,
    preset,
    changePreset: setPreset,
    range,
    ownerId,
    changeOwnerId: setOwnerId,
    ownerOptions: getOwnerOptions(membersQuery.data?.members ?? []),
    stats: query.data ?? null,
    isFetching: query.isFetching,
  };
};

export type CycleTimeViewTypes = ReturnType<typeof useCycleTimeStats>;
