import { Inject, Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { Cron } from "@nestjs/schedule";
import { firstValueFrom } from "rxjs";
import { NOTIFICATION_PATTERNS, type RunContractExpiryAlertsResult } from "@lawai/contracts";
import { NotificationHubService } from "./notification-hub.service";

// 게이트웨이가 user-service 보다 먼저 뜰 수 있어, 기동 뒤 잠시 기다렸다가 한 번 돌린다.
const STARTUP_DELAY_MS = 30_000;

/**
 * 계약 만료 임박 알림 스케줄러 — 매일(UTC 자정 = 한국 시간 오전 9시)과 기동 시 user-service 에 알림을 만들게 하고,
 * 돌려받은 알림을 SSE 허브로 밀어 새로고침 없이 바로 보이게 한다(알림을 만드는 규칙·중복 방지는 user-service 담당).
 */
@Injectable()
export class ContractExpiryAlertsScheduler implements OnApplicationBootstrap {
  private readonly logger = new Logger(ContractExpiryAlertsScheduler.name);

  constructor(
    @Inject("USER_CLIENT") private readonly userClient: ClientProxy,
    private readonly hub: NotificationHubService,
  ) {}

  onApplicationBootstrap(): void {
    // unref — 이 타이머 때문에 테스트·종료가 붙잡히지 않게.
    setTimeout(() => void this.run(), STARTUP_DELAY_MS).unref();
  }

  @Cron("0 0 0 * * *", { name: "contract-expiry-alerts", timeZone: "UTC" })
  handleDaily(): Promise<void> {
    return this.run();
  }

  /** 알림을 만들고 받는 사람마다 실시간으로 민다. 실패해도 게이트웨이를 멈추지 않고 기록만 남긴다. */
  async run(): Promise<void> {
    try {
      const { notifications } = await firstValueFrom(
        this.userClient.send<RunContractExpiryAlertsResult>(NOTIFICATION_PATTERNS.RUN_CONTRACT_EXPIRY_ALERTS, {}),
      );
      notifications.forEach((n) => this.hub.push(n.recipientId, n.notification));
      if (notifications.length > 0) this.logger.log(`계약 만료 임박 알림 ${notifications.length}건`);
    } catch (error) {
      this.logger.error("계약 만료 임박 알림 실패", error instanceof Error ? error.stack : String(error));
    }
  }
}
