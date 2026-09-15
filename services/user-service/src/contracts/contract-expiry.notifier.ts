import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
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
 * 계약 만료 임박 알림 — 매일 한 번, 만료가 90·30·7일 안으로 들어온 계약의 담당자·요청자·작성자에게 알린다.
 * 같은 계약·같은 시점 알림은 사람마다 한 번만 보낸다(이미 보낸 알림을 확인). 그래서 하루에 여러 번 돌아도 안전하다.
 * 실시간 푸시(SSE)는 게이트웨이를 거치는 요청에서만 나가므로, 이 알림은 알림 목록을 다시 불러올 때 보인다.
 */
@Injectable()
export class ContractExpiryNotifier implements OnApplicationBootstrap {
  private readonly logger = new Logger(ContractExpiryNotifier.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
  ) {}

  // 배포·재시작 직후에도 오늘 치 알림이 나가게 한 번 돌린다(중복은 위 확인으로 걸러진다).
  onApplicationBootstrap(): void {
    void this.runSafely();
  }

  // 매일 UTC 자정 = 한국 시간 오전 9시.
  @Cron("0 0 0 * * *", { name: "contract-expiry-alerts", timeZone: "UTC" })
  handleDaily(): Promise<void> {
    return this.runSafely();
  }

  private async runSafely(): Promise<void> {
    try {
      const count = await this.notifyExpiring(new Date());
      if (count > 0) this.logger.log(`계약 만료 임박 알림 ${count}건 생성`);
    } catch (error) {
      this.logger.error("계약 만료 임박 알림 실패", error instanceof Error ? error.stack : String(error));
    }
  }

  /** 만료 임박 계약의 관련자에게 아직 안 보낸 알림을 만든다. 만든 알림 수를 돌려준다. */
  async notifyExpiring(now: Date): Promise<number> {
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
    if (contracts.length === 0) return 0;

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
    if (pending.length === 0) return 0;

    await this.notifications.createMany(pending);
    return pending.length;
  }
}
