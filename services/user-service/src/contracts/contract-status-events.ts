import type { StatusEventsService } from "../common/status-events/status-events.service";

// 단계별 소요시간(업무 통계)을 재려고 상태가 바뀐 시각을 남긴다. 실패해도 계약 처리는 그대로 간다(fire-and-forget).
export const recordContractStatus = (
  statusEvents: StatusEventsService,
  row: { id: string; tenantId: string; ownerId: string | null },
  fromStatus: string | null,
  toStatus: string,
  actorId: string | null,
): void => {
  void statusEvents.record({
    tenantId: row.tenantId,
    targetType: "contract",
    targetId: row.id,
    fromStatus,
    toStatus,
    ownerId: row.ownerId,
    actorId,
  });
};
