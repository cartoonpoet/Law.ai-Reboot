import { useQueries, useQuery } from "@tanstack/react-query";
import type { ContractStatus, TenantRole } from "@lawai/contracts";
import { getApprovalInbox } from "../../../api/approvals";
import { listContracts } from "../../../api/contracts";
import { useAiInsights } from "../../../components/ai/useAiInsights";
import { useMe } from "../../../components/layout/hooks/useMe";
import { useTenantSwitcher } from "../../../components/layout/hooks/useTenantSwitcher";
import { buildPipeline, PIPELINE_STATUSES } from "../buildPipeline";
import { buildTodos } from "../buildTodos";
import { getUpcomingDeadlines } from "../getUpcomingDeadlines";

// 할 일·기한을 뽑을 진행 중 계약 — 목록 API 한 페이지 최대치.
const ACTIVE_CONTRACTS_PAGE_SIZE = 100;

// 서버 contracts.authz 에서 배정(assign) 권한이 있는 역할
const ASSIGNER_ROLES: TenantRole[] = ["inHouseCounsel", "contractManager"];

/**
 * 대시보드 데이터 — 진행 중 계약 목록 + 내 차례 결재 + 상태별 계약 건수.
 * 할 일·기한은 계약 목록에서, 파이프라인 건수는 상태별 total(pageSize 1)로 가져와 100건 넘어도 정확하게.
 */
export const useDashboard = () => {
  const { me } = useMe();
  const { activeMembership } = useTenantSwitcher();

  const contractsQuery = useQuery({
    queryKey: ["dashboard", "activeContracts"],
    queryFn: () => listContracts({ statuses: PIPELINE_STATUSES.join(","), pageSize: ACTIVE_CONTRACTS_PAGE_SIZE }),
    meta: { errorTitle: "진행 중인 계약을 불러오지 못했어요" },
  });

  const inboxQuery = useQuery({
    queryKey: ["dashboard", "approvalInbox"],
    queryFn: getApprovalInbox,
    meta: { errorTitle: "결재 대기함을 불러오지 못했어요" },
  });

  const countQueries = useQueries({
    queries: PIPELINE_STATUSES.map((status) => ({
      queryKey: ["dashboard", "contractCount", status],
      queryFn: () => listContracts({ status, pageSize: 1 }),
      // 진행 중 계약 조회 실패 토스트와 겹치지 않게 조용히
      meta: { errorMode: "silent" as const },
    })),
  });

  const now = new Date();
  const contracts = contractsQuery.data?.items ?? [];
  const viewerId = me?.id ?? "";
  const canAssign = Boolean(me?.isSystemAdmin) || (activeMembership !== null && ASSIGNER_ROLES.includes(activeMembership.role));

  const counts = Object.fromEntries(
    PIPELINE_STATUSES.map((status, i) => [status, countQueries[i].data?.total ?? 0]),
  ) as Record<ContractStatus, number>;

  const todos = me ? buildTodos({ contracts, approvals: inboxQuery.data?.pending ?? [], viewer: { id: viewerId, canAssign }, now }) : [];
  // 할 일마다 실제 AI 분석 결과 한 줄(기한 가까운 할 일부터)
  const insights = useAiInsights(todos.flatMap((t) => (t.aiTarget ? [t.aiTarget] : [])));

  return {
    todos,
    insights,
    isTodosLoading: contractsQuery.isLoading || inboxQuery.isLoading || !me,
    stages: buildPipeline(counts),
    isPipelineLoading: countQueries.some((q) => q.isLoading),
    deadlines: me ? getUpcomingDeadlines(contracts, viewerId, now) : [],
    isDeadlinesLoading: contractsQuery.isLoading || !me,
  };
};
