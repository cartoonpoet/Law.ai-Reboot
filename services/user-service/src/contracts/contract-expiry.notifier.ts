import { Injectable } from "@nestjs/common";
import type { PushNotification } from "@lawai/contracts";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationService } from "../notifications/notifications.service";
import type { CreateNotificationInput } from "../notifications/notifications.service";

const DAY_MS = 24 * 60 * 60 * 1000;
// 만료 알림을 보내는 남은 일수(작은 것부터). 계약마다 지금 남은 일수에 맞는 가장 가까운 시점 하나만 보낸다.
export const EXPIRY_ALERT_DAYS = [7, 30, 90] as const;
// 만료를 챙길 계약 — 체결됐거나 이행 중인 계약만(종료·검토 중 계약은 제외).
const ACTIVE_STATUSES = ["signed", "fulfilling"] as const;
// 사람이 아닌 시스템이 보낸 알림의 보낸 사람 id.
export const SYSTEM_ACTOR_ID = "system";

export const getExpiryAlertType = (days: number): string => `contract_expiring_${days}`;

// periodEnd 는 "그날 00:00 UTC"로 저장되므로 날짜 경계도 UTC 자정으로 맞춘다(contracts.service 만료 필터와 같은 기준).
const getTodayStartUtc = (now: Date): Date =>
  new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

/**
 * 계약 만료 임박 알림 — 만료가 90·30·7일 안으로 들어온 계약의 담당자·요청자·작성자에게 알린다.
 * 같은 계약·같은 시점 알림은 사람마다 한 번만 보낸다(이미 보낸 알림을 확인). 그래서 여러 번 불러도 안전하다.
 * 언제 부를지는 게이트웨이 스케줄러가 정한다(매일 + 기동 시) — 게이트웨이가 돌려받은 알림을 실시간(SSE)으로 밀어준다.
 * 받는 사람이 알림 설정에서 "계약 만료 알림"을 껐으면 NotificationService 가 거른다.
 */
@Injectable()
export class ContractExpiryNotifier {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
  ) {}

  /** 만료 임박 계약의 관련자에게 아직 안 보낸 알림을 만들고, 실시간으로 밀어줄 알림 목록을 돌려준다. */
  async notifyExpiring(now: Date): Promise<PushNotification[]> {
    const todayStart = getTodayStartUtc(now);
    const maxDays = EXPIRY_ALERT_DAYS[EXPIRY_ALERT_DAYS.length - 1];
    const contracts = await this.prisma.contract.findMany({
      where: {
        deletedAt: null,
        status: { in: [...ACTIVE_STATUSES] },
        periodEnd: { gte: todayStart, lte: new Date(todayStart.getTime() + maxDays * DAY_MS) },
      },
      select: { id: true, title: true, tenantId: true, periodEnd: true, ownerId: true, requesterId: true, createdById: true },
    });
    if (contracts.length === 0) return [];

    const candidates: CreateNotificationInput[] = contracts.flatMap((contract) => {
      const periodEnd = contract.periodEnd as Date;
      const daysLeft = Math.round((periodEnd.getTime() - todayStart.getTime()) / DAY_MS);
      const alertDays = EXPIRY_ALERT_DAYS.find((days) => daysLeft <= days);
      if (alertDays === undefined) return [];

      const endDate = periodEnd.toISOString().slice(0, 10);
      const remaining = daysLeft === 0 ? "오늘 만료" : `${daysLeft}일 남음`;
      const recipientIds = Array.from(
        new Set([contract.ownerId, contract.requesterId, contract.createdById].filter((id): id is string => Boolean(id))),
      );
      return recipientIds.map((recipientId) => ({
        recipientId,
        type: getExpiryAlertType(alertDays),
        actorId: SYSTEM_ACTOR_ID,
        targetType: "Contract",
        targetId: contract.id,
        tenantId: contract.tenantId,
        detail: {
          contractId: contract.id,
          title: contract.title,
          preview: `${contract.title} · ${endDate} 만료 (${remaining})`,
          daysLeft,
        },
      }));
    });

    const alreadySent = await this.prisma.notification.findMany({
      where: {
        targetType: "Contract",
        targetId: { in: contracts.map((contract) => contract.id) },
        type: { in: EXPIRY_ALERT_DAYS.map(getExpiryAlertType) },
      },
      select: { recipientId: true, type: true, targetId: true },
    });
    const toKey = (n: { recipientId: string; type: string; targetId: string }) => `${n.recipientId}:${n.type}:${n.targetId}`;
    const sentKeys = new Set(alreadySent.map(toKey));
    const pending = candidates.filter((candidate) => !sentKeys.has(toKey(candidate)));
    if (pending.length === 0) return [];

    return this.notifications.createMany(pending);
  }
}
