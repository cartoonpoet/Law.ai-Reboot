import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

/** 통계를 내는 대상. 나중에 송무 사건이 붙으면 여기 늘린다. */
export type StatusEventTargetTypes = "contract" | "advice";

export interface RecordStatusEventParams {
  tenantId: string;
  targetType: StatusEventTargetTypes;
  targetId: string;
  /** 새로 만들어진 건이면 null */
  fromStatus: string | null;
  toStatus: string;
  /** 그 시점의 담당자 — 담당자별 통계에 쓴다 */
  ownerId?: string | null;
  actorId?: string | null;
  /** 기록 시각을 직접 줄 때만(백필 등). 기본은 지금. */
  at?: Date;
}

/**
 * 상태가 바뀐 시각을 남기는 헬퍼.
 *
 * - 단일 책임: StatusEvent 행 write 만 한다. "무엇을 기록할지"는 호출부가 정한다.
 * - best-effort: 통계용 기록이 실패해도 계약·자문 처리는 그대로 진행한다(AuditService 와 같은 정책).
 * - 같은 상태로 바뀌는 건(from === to) 기록하지 않는다 — 소요시간 계산에 잡음만 된다.
 */
@Injectable()
export class StatusEventsService {
  private readonly logger = new Logger(StatusEventsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(params: RecordStatusEventParams): Promise<void> {
    if (params.fromStatus === params.toStatus) return;

    try {
      await this.prisma.statusEvent.create({
        data: {
          tenantId: params.tenantId,
          targetType: params.targetType,
          targetId: params.targetId,
          fromStatus: params.fromStatus,
          toStatus: params.toStatus,
          ownerId: params.ownerId ?? null,
          actorId: params.actorId ?? null,
          ...(params.at ? { at: params.at } : {}),
        },
      });
    } catch (error) {
      this.logger.error(
        `상태 기록 실패 (${params.targetType}:${params.targetId} ${params.fromStatus} → ${params.toStatus})`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
