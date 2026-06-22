import { Global, Module } from "@nestjs/common";
import { NotificationHubService } from "./notification-hub.service";

/**
 * @Global 모듈(clients.module 패턴) — contracts/notifications 컨트롤러 양쪽에서
 * NotificationHubService 를 주입할 수 있게 전역 등록.
 */
@Global()
@Module({
  providers: [NotificationHubService],
  exports: [NotificationHubService],
})
export class NotificationHubModule {}
