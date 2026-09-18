import { Injectable, Logger } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import { Prisma } from "@prisma/client";
import { getNotificationCategory, getNotificationContractId } from "@lawai/contracts";
import type {
  ListNotificationsRequest,
  ListNotificationsResponse,
  MarkNotificationReadRequest,
  MarkNotificationReadResult,
  MarkAllNotificationsReadRequest,
  NotificationDto,
  PushNotification,
} from "@lawai/contracts";
import { PrismaService } from "../prisma/prisma.service";
import { tenantScope } from "../common/tenant-scope";

// notification 행 → DTO 매핑에 필요한 최소 필드(createMany/listForViewer 공유).
type NotificationRow = {
  id: string;
  type: string;
  actorId: string;
  targetType: string;
  targetId: string;
  detail: Prisma.JsonValue;
  readAt: Date | null;
  createdAt: Date;
};

// 알림 1건 생성 입력(폴리모픽). detail 미지정 시 Prisma.JsonNull 로 저장.
export interface CreateNotificationInput {
  recipientId: string;
  type: string;
  actorId: string;
  targetType: string;
  targetId: string;
  detail?: Prisma.InputJsonValue;
  // 테넌트 격리: 생성 시 tenantId 를 반드시 주입해야 한다(필수). 누락 시 RpcException.
  tenantId: string;
}

// 목록 기본 조회 개수(최근 N건). limit 미지정 시 적용.
const DEFAULT_LIST_LIMIT = 20;

/**
 * 인앱 알림 도메인 서비스(생성/조회/읽음).
 *
 * - 폴리모픽: recipientId + type + targetType/targetId. DB FK 없음(AuditLog 선례, 앱 무결성).
 * - best-effort 생성: 알림 write 실패가 코멘트 작성 등 비즈니스 로직을 깨지 않도록
 *   try/catch 로 감싸 실패를 swallow 하고 로깅만 한다(AuditService 패턴).
 * - 권한: 모든 조회/읽음은 where 절에 recipientId === viewerId 를 강제해 본인 알림만 다룬다.
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * notification 행 → NotificationDto 매핑(listForViewer/createMany 공유 헬퍼).
   * - actorName 은 actorId→이름 맵에서 조회(없으면 빈 문자열).
   * - isRead 는 readAt != null 로 파생(DTO 에는 readAt 미노출).
   * - isTargetDeleted 는 detail.contractId 가 삭제된 계약 집합에 있는지로 파생.
   */
  private toNotificationDto(
    row: NotificationRow,
    actorNameById: Map<string, string>,
    deletedContractIds: Set<string>,
  ): NotificationDto {
    const detail = (row.detail as Record<string, unknown> | null) ?? null;
    const contractId = getNotificationContractId(detail);
    return {
      id: row.id,
      type: row.type,
      actorId: row.actorId,
      actorName: actorNameById.get(row.actorId) ?? "",
      targetType: row.targetType,
      targetId: row.targetId,
      detail,
      isRead: row.readAt != null,
      isTargetDeleted: contractId !== null && deletedContractIds.has(contractId),
      createdAt: row.createdAt.toISOString(),
    };
  }

  // 알림들이 가리키는 계약 중 삭제된 것만 한 번에 조회(N+1 회피). 가리키는 계약이 없으면 조회하지 않는다.
  private async loadDeletedContractIds(rows: NotificationRow[]): Promise<Set<string>> {
    const contractIds = Array.from(
      new Set(
        rows
          .map((row) => getNotificationContractId(row.detail as Record<string, unknown> | null))
          .filter((id): id is string => id !== null),
      ),
    );
    if (contractIds.length === 0) return new Set();
    const deleted = await this.prisma.contract.findMany({
      where: { id: { in: contractIds }, deletedAt: { not: null } },
      select: { id: true },
    });
    return new Set(deleted.map((c) => c.id));
  }

  // 수신자 설정을 한 번에 읽어, 그 사람이 끈 묶음(결재·코멘트)의 알림을 뺀다. 묶음이 없는 알림은 항상 남긴다.
  private async dropMutedCategories(
    items: CreateNotificationInput[],
  ): Promise<CreateNotificationInput[]> {
    const recipients = await this.prisma.user.findMany({
      where: { id: { in: Array.from(new Set(items.map((item) => item.recipientId))) } },
      select: { id: true, notifyApproval: true, notifyComment: true, notifyContractExpiry: true },
    });
    const mutedByUserId = new Map(
      recipients.map((r) => [
        r.id,
        {
          approval: r.notifyApproval === false,
          comment: r.notifyComment === false,
          contract: r.notifyContractExpiry === false,
        },
      ]),
    );
    return items.filter((item) => {
      const category = getNotificationCategory(item.type);
      return !(category && mutedByUserId.get(item.recipientId)?.[category]);
    });
  }

  // actorId 집합 → 이름 맵(한 번에 조회해 N+1 회피). 빈 집합이면 빈 맵.
  private async loadActorNames(
    actorIds: string[],
  ): Promise<Map<string, string>> {
    const uniqueIds = Array.from(new Set(actorIds));
    if (uniqueIds.length === 0) return new Map();
    const actors = await this.prisma.user.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true, name: true },
    });
    return new Map(actors.map((a) => [a.id, a.name]));
  }

  /**
   * 알림 다건 생성(best-effort). 빈 배열이면 no-op.
   * - 자기알림(recipientId === actorId)은 방어적으로 여기서도 제외한다(호출부도 필터).
   * - 실패해도 예외를 던지지 않고 빈 배열을 반환한다(코멘트 응답 보호).
   * - Prisma createMany 는 생성 행(id)을 돌려주지 않으므로, 생성 직후 동일 조건으로
   *   재조회해 NotificationDto 로 매핑하고, 각 수신자별 PushNotification 으로 반환한다
   *   (gateway 가 SSE fan-out 에 사용).
   */
  async createMany(
    items: CreateNotificationInput[],
  ): Promise<PushNotification[]> {
    const candidates = items.filter((item) => item.recipientId !== item.actorId);
    if (candidates.length === 0) return [];
    try {
      // 받는 사람이 끈 알림 종류(결재·코멘트)는 만들지 않는다.
      const targets = await this.dropMutedCategories(candidates);
      if (targets.length === 0) return [];
      const createdAtFrom = new Date();
      await this.prisma.notification.createMany({
        data: targets.map((item) => ({
          recipientId: item.recipientId,
          type: item.type,
          actorId: item.actorId,
          targetType: item.targetType,
          targetId: item.targetId,
          tenantId: item.tenantId,
          detail: item.detail ?? Prisma.JsonNull,
        })),
      });

      // 방금 생성한 행 재조회(id 확보). recipientId/actorId/targetType/targetId/type +
      // createdAt >= 생성 시작 시각으로 좁혀, 동일 대상 과거 알림과 겹치지 않게 한다.
      // tenantId 필터로 타 테넌트 동시 생성 알림이 결과에 섞이지 않도록 격리한다(I1).
      const recipientIds = targets.map((t) => t.recipientId);
      const targetIds = targets.map((t) => t.targetId);
      const tenantIds = [...new Set(targets.map((t) => t.tenantId))];
      const rows = await this.prisma.notification.findMany({
        where: {
          recipientId: { in: recipientIds },
          targetId: { in: targetIds },
          tenantId: { in: tenantIds },
          createdAt: { gte: createdAtFrom },
        },
        orderBy: { createdAt: "asc" },
      });

      const actorNameById = await this.loadActorNames(
        rows.map((row) => row.actorId),
      );

      return rows.map((row) => ({
        recipientId: row.recipientId,
        // 방금 만든 알림이라 가리키는 계약은 살아 있다.
        notification: this.toNotificationDto(row, actorNameById, new Set()),
      }));
    } catch (error) {
      // best-effort: 실패해도 비즈니스 응답은 진행. 누락만 로깅하고 빈 배열 반환.
      this.logger.error(
        `notification createMany 실패 (count=${candidates.length})`,
        error instanceof Error ? error.stack : String(error),
      );
      return [];
    }
  }

  /**
   * viewer 본인 알림 최근 목록 + 안읽음 카운트.
   * - actorName 은 actorId 모아 users.User 를 한 번에 조회해 매핑(N+1 회피).
   * - isRead 는 readAt != null 로 파생(DTO 에는 readAt 미노출).
   */
  async listForViewer(
    req: ListNotificationsRequest,
  ): Promise<ListNotificationsResponse> {
    const viewerId = req.viewerId;
    if (!viewerId) return { items: [], unreadCount: 0 };

    const limit = req.limit ?? DEFAULT_LIST_LIMIT;
    const ctx = req.tenantContext;
    if (!ctx) {
      throw new RpcException({ status: 400, message: "테넌트 컨텍스트가 없습니다" });
    }
    const tScope = tenantScope(ctx);

    const [rows, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { recipientId: viewerId, ...tScope },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      this.prisma.notification.count({
        where: { recipientId: viewerId, readAt: null, ...tScope },
      }),
    ]);

    // actorId·계약 id 를 모아 한 번씩 조회(N+1 회피) 후 공용 헬퍼로 DTO 매핑.
    const [actorNameById, deletedContractIds] = await Promise.all([
      this.loadActorNames(rows.map((row) => row.actorId)),
      this.loadDeletedContractIds(rows),
    ]);
    const items = rows.map((row) =>
      this.toNotificationDto(row, actorNameById, deletedContractIds),
    );

    return { items, unreadCount };
  }

  /**
   * 단건 읽음 처리. 본인(recipientId === viewerId) 알림만 — 타인 알림은 0건 영향(차단).
   * tenantScope 로 타 테넌트 알림을 읽음 처리하는 것도 차단한다.
   */
  // TCP 마이크로서비스 응답이 비면 게이트웨이의 firstValueFrom 이 "no elements in sequence" 로 터진다.
  // 그래서 읽음 처리는 결과가 없어도 { ok: true } 를 돌려준다.
  async markRead(req: MarkNotificationReadRequest): Promise<MarkNotificationReadResult> {
    if (!req.viewerId) return { ok: true };
    const ctx = req.tenantContext;
    if (!ctx) {
      throw new RpcException({ status: 400, message: "테넌트 컨텍스트가 없습니다" });
    }
    const tScope = tenantScope(ctx);
    await this.prisma.notification.updateMany({
      where: { id: req.id, recipientId: req.viewerId, readAt: null, ...tScope },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }

  /**
   * 전체 읽음 처리. viewer 본인 안읽음 전부.
   * tenantScope 로 타 테넌트 알림이 섞이지 않도록 격리한다.
   */
  async markAllRead(req: MarkAllNotificationsReadRequest): Promise<MarkNotificationReadResult> {
    if (!req.viewerId) return { ok: true };
    const ctx = req.tenantContext;
    if (!ctx) {
      throw new RpcException({ status: 400, message: "테넌트 컨텍스트가 없습니다" });
    }
    const tScope = tenantScope(ctx);
    await this.prisma.notification.updateMany({
      where: { recipientId: req.viewerId, readAt: null, ...tScope },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }
}
