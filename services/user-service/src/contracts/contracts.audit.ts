import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { AuditAction } from "@lawai/contracts";
import { PrismaService } from "../prisma/prisma.service";

/**
 * 폴리모픽 AuditLog 기록 헬퍼.
 *
 * - 단일 책임: AuditLog 행 write 만 담당한다(SRP). "어떤 조회를 기록할지"(view 한정 등)
 *   같은 정책 판단은 호출부(service)가 가진다. 이 헬퍼는 무조건 받은 파라미터를 기록.
 * - 폴리모픽: targetType("Contract" 등) + targetId 로 대상 지정. DB FK 는 없다(앱 무결성).
 * - best-effort: 감사 write 실패가 비즈니스 로직(계약 생성/수정/전이/조회)을 깨지 않도록
 *   try/catch 로 감싸 실패를 swallow 하고 로깅만 한다. 강한 감사 보장이 필요해지면
 *   호출부에서 트랜잭션에 묶거나 이 정책을 바꾼다(03-phases 위험 섹션 결정).
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 감사 1건 기록. id/at 은 Prisma default(uuid/now)로 자동 채워진다.
   * detail 미지정 시 Prisma.JsonNull 로 명시 저장(컬럼은 Json? = nullable).
   */
  async record(params: {
    targetType: string;
    targetId: string;
    actorId: string;
    action: AuditAction;
    tenantId: string;
    detail?: Prisma.InputJsonValue;
  }): Promise<void> {
    const { targetType, targetId, actorId, action, tenantId, detail } = params;
    try {
      await this.prisma.auditLog.create({
        data: {
          targetType,
          targetId,
          actorId,
          action,
          tenantId,
          detail: detail ?? Prisma.JsonNull,
        },
      });
    } catch (error) {
      // best-effort: 실패해도 비즈니스 응답은 진행. 누락만 로깅.
      this.logger.error(
        `audit record 실패 (action=${action} target=${targetType}:${targetId} actor=${actorId})`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
