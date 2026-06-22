import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { NOTIFICATION_PATTERNS } from "@lawai/contracts";
import type {
  ListNotificationsRequest,
  MarkNotificationReadRequest,
  MarkAllNotificationsReadRequest,
} from "@lawai/contracts";
import { NotificationService } from "./notifications.service";

@Controller()
export class NotificationsController {
  constructor(private readonly notifications: NotificationService) {}

  @MessagePattern(NOTIFICATION_PATTERNS.LIST)
  list(@Payload() req: ListNotificationsRequest) {
    return this.notifications.listForViewer(req);
  }

  @MessagePattern(NOTIFICATION_PATTERNS.MARK_READ)
  markRead(@Payload() req: MarkNotificationReadRequest) {
    return this.notifications.markRead(req);
  }

  @MessagePattern(NOTIFICATION_PATTERNS.MARK_ALL_READ)
  markAllRead(@Payload() req: MarkAllNotificationsReadRequest) {
    return this.notifications.markAllRead(req);
  }
}
