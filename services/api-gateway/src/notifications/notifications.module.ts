import { Module } from "@nestjs/common";
import { NotificationsController } from "./notifications.controller";
import { ContractExpiryAlertsScheduler } from "./contract-expiry-alerts.scheduler";

@Module({
  controllers: [NotificationsController],
  // 매일 계약 만료 임박 알림을 만들고 SSE 로 민다(ScheduleModule 은 AppModule 에서 켠다).
  providers: [ContractExpiryAlertsScheduler],
})
export class NotificationsModule {}
