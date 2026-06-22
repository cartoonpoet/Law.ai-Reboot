import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type {
  ListNotificationsRequest,
  ListNotificationsResponse,
  MarkNotificationReadRequest,
  MarkAllNotificationsReadRequest,
  NotificationDto,
} from "@lawai/contracts";
import { PrismaService } from "../prisma/prisma.service";

// 알림 1건 생성 입력(폴리모픽). detail 미지정 시 Prisma.JsonNull 로 저장.
export interface CreateNotificationInput {
  recipientId: string;
  type: string;
  actorId: string;
  targetType: string;
  targetId: string;
  detail?: Prisma.InputJsonValue;
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
   * 알림 다건 생성(best-effort). 빈 배열이면 no-op.
   * - 자기알림(recipientId === actorId)은 방어적으로 여기서도 제외한다(호출부도 필터).
   * - 실패해도 예외를 던지지 않고 로깅만 한다(코멘트 응답 보호).
   */
  async createMany(items: CreateNotificationInput[]): Promise<void> {
    const targets = items.filter((item) => item.recipientId !== item.actorId);
    if (targets.length === 0) return;
    try {
      await this.prisma.notification.createMany({
        data: targets.map((item) => ({
          recipientId: item.recipientId,
          type: item.type,
          actorId: item.actorId,
          targetType: item.targetType,
          targetId: item.targetId,
          detail: item.detail ?? Prisma.JsonNull,
        })),
      });
    } catch (error) {
      // best-effort: 실패해도 비즈니스 응답은 진행. 누락만 로깅.
      this.logger.error(
        `notification createMany 실패 (count=${targets.length})`,
        error instanceof Error ? error.stack : String(error),
      );
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

    const [rows, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { recipientId: viewerId },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      this.prisma.notification.count({
        where: { recipientId: viewerId, readAt: null },
      }),
    ]);

    // actorId 모아 한 번에 이름 조회(N+1 회피).
    const actorIds = Array.from(new Set(rows.map((row) => row.actorId)));
    const actors =
      actorIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: actorIds } },
            select: { id: true, name: true },
          })
        : [];
    const actorNameById = new Map(actors.map((a) => [a.id, a.name]));

    const items: NotificationDto[] = rows.map((row) => ({
      id: row.id,
      type: row.type,
      actorId: row.actorId,
      actorName: actorNameById.get(row.actorId) ?? "",
      targetType: row.targetType,
      targetId: row.targetId,
      detail: (row.detail as Record<string, unknown> | null) ?? null,
      isRead: row.readAt != null,
      createdAt: row.createdAt.toISOString(),
    }));

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
