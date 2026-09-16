import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module";
import { SupportController } from "./support.controller";
import { SupportService } from "./support.service";

@Module({
  // 관리자 답변 시 알림을 만들려면 NotificationService 가 필요하다.
  imports: [NotificationsModule],
  controllers: [SupportController],
  providers: [SupportService],
})
export class SupportModule {}
