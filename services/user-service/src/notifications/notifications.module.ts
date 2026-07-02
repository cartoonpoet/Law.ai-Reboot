import { Module } from "@nestjs/common";
import { NotificationsController } from "./notifications.controller";
import { NotificationService } from "./notifications.service";

@Module({
  controllers: [NotificationsController],
  // NotificationService 는 comments.service(멘션→알림 트리거)에서 주입하므로 export.
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationsModule {}
