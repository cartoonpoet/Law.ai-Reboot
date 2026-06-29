import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type {
  ListNotificationsRequest,
  ListNotificationsResponse,
  MarkNotificationReadRequest,
  MarkAllNotificationsReadRequest,
  NotificationDto,
  PushNotification,
} from "@lawai/contracts";
import { PrismaService } from "../prisma/prisma.service";
import { tenantScope, resolveTenantId } from "../common/tenant-scope";

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
  // 테넌트 격리: 생성 시 tenantId 를 직접 주입한다. 미지정 시 빈 문자열(fallback — 호출부가 항상 제공).
  tenantId?: string;
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
   */
  private toNotificationDto(
    row: NotificationRow,
    actorNameById: Map<string, string>,
  ): NotificationDto {
    return {
      id: row.id,
      type: row.type,
      actorId: row.actorId,
      actorName: actorNameById.get(row.actorId) ?? "",
      targetType: row.targetType,
      targetId: row.targetId,
      detail: (row.detail as Record<string, unknown> | null) ?? null,
      isRead: row.readAt != null,
      createdAt: row.createdAt.toISOString(),
    };
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
    const targets = items.filter((item) => item.recipientId !== item.actorId);
    if (targets.length === 0) return [];
    try {
      const createdAtFrom = new Date();
      await this.prisma.notification.createMany({
        data: targets.map((item) => ({
          recipientId: item.recipientId,
          type: item.type,
          actorId: item.actorId,
          targetType: item.targetType,
          targetId: item.targetId,
          tenantId: item.tenantId ?? "",
          detail: item.detail ?? Prisma.JsonNull,
        })),
      });

      // 방금 생성한 행 재조회(id 확보). recipientId/actorId/targetType/targetId/type +
      // createdAt >= 생성 시작 시각으로 좁혀, 동일 대상 과거 알림과 겹치지 않게 한다.
      const recipientIds = targets.map((t) => t.recipientId);
      const targetIds = targets.map((t) => t.targetId);
      const rows = await this.prisma.notification.findMany({
        where: {
          recipientId: { in: recipientIds },
          targetId: { in: targetIds },
          createdAt: { gte: createdAtFrom },
        },
        orderBy: { createdAt: "asc" },
      });

      const actorNameById = await this.loadActorNames(
        rows.map((row) => row.actorId),
      );

      return rows.map((row) => ({
        recipientId: row.recipientId,
        notification: this.toNotificationDto(row, actorNameById),
      }));
    } catch (error) {
      // best-effort: 실패해도 비즈니스 응답은 진행. 누락만 로깅하고 빈 배열 반환.
      this.logger.error(
        `notification createMany 실패 (count=${targets.length})`,
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
    const tScope = ctx ? tenantScope(ctx) : {};

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

    // actorId 모아 한 번에 이름 조회(N+1 회피) 후 공용 헬퍼로 DTO 매핑.
    const actorNameById = await this.loadActorNames(
      rows.map((row) => row.actorId),
    );
    const items = rows.map((row) => this.toNotificationDto(row, actorNameById));

    return { items, unreadCount };
  }

  /**
   * 단건 읽음 처리. 본인(recipientId === viewerId) 알림만 — 타인 알림은 0건 영향(차단).
   */
  async markRead(req: MarkNotificationReadRequest): Promise<void> {
    if (!req.viewerId) return;
    await this.prisma.notification.updateMany({
      where: { id: req.id, recipientId: req.viewerId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  /**
   * 전체 읽음 처리. viewer 본인 안읽음 전부.
   */
  async markAllRead(req: MarkAllNotificationsReadRequest): Promise<void> {
    if (!req.viewerId) return;
    await this.prisma.notification.updateMany({
      where: { recipientId: req.viewerId, readAt: null },
      data: { readAt: new Date() },
    });
  }
}
