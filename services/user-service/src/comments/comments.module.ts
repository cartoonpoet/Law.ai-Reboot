import { Module } from "@nestjs/common";
import { CommentsController } from "./comments.controller";
import { CommentsService } from "./comments.service";
import { AuditService } from "../contracts/contracts.audit";
import { NotificationsModule } from "../notifications/notifications.module";
import { MailModule } from "../mail/mail.module";

@Module({
  // NotificationsModule 은 NotificationService 를 export 한다(멘션→알림 트리거 주입용).
  // MailModule 은 MailService 를 export 한다(멘션→이메일 발송 주입용, best-effort).
  imports: [NotificationsModule, MailModule],
  controllers: [CommentsController],
  // contracts.authz 는 순수 함수 모듈이라 provider 불필요(import 만).
  // AuditService 는 코멘트 생성 감사 기록에 재사용(생성자 주입).
  providers: [CommentsService, AuditService],
})
export class CommentsModule {}
