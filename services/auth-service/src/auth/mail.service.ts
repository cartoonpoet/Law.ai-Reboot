import { Injectable, Logger } from "@nestjs/common";

/**
 * 메일 전송 추상화. 현재는 실제 SMTP 연동이 없어 개발용으로 재설정 링크를
 * 로그에 출력한다. 운영 환경에서 SMTP/SES 등을 붙일 때 이 클래스만 교체하면 된다.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  sendPasswordResetLink(email: string, resetLink: string): void {
    // TODO: 실제 메일 발송기로 교체 (현재는 dev 로그 스텁)
    this.logger.log(`[비밀번호 재설정] ${email} → ${resetLink}`);
  }

  sendInviteLink(email: string, inviteLink: string, tenantName: string): void {
    // TODO: 실제 메일 발송기로 교체 (현재는 dev 로그 스텁)
    this.logger.log(`[고객사 초대] ${tenantName} → ${email} → ${inviteLink}`);
  }
}
