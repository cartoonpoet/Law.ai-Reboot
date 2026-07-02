import { Injectable, Logger } from "@nestjs/common";
import { Resend } from "resend";

/**
 * 멘션 이메일 발송(Resend). ConfigModule 없이 process.env 직접 사용.
 * - RESEND_API_KEY 가 없으면 스텁 모드(실제 발송 skip, 로그만) — dev/CI 안전.
 * - 발송 전체를 try/catch 로 감싸 best-effort(실패해도 throw 안 함, logger.error 만).
 */
export interface SendMentionEmailParams {
  to: string;
  recipientName: string;
  actorName: string;
  contractTitle: string;
  contractId: string;
  preview: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend | null;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    this.resend = apiKey ? new Resend(apiKey) : null;
    if (!this.resend) {
      this.logger.log("[mail] RESEND_API_KEY 미설정 — 스텁 모드(실제 발송 skip)");
    }
  }

  async sendMentionEmail(params: SendMentionEmailParams): Promise<void> {
    const { to, recipientName, actorName, contractTitle, contractId, preview } = params;

    if (!this.resend) {
      this.logger.log(
        `[mail stub] mention email to ${to} (${recipientName}) — ${actorName}님이 [${contractTitle}] 에서 멘션`,
      );
      return;
    }

    const from = process.env.MAIL_FROM ?? "onboarding@resend.dev";
    const webUrl = process.env.APP_WEB_URL ?? "http://localhost:5173";
    const link = `${webUrl}/contract/${contractId}`;
    const subject = `${actorName}님이 회원님을 멘션했습니다`;

    try {
      await this.resend.emails.send({
        from,
        to,
        subject,
        html: buildMentionHtml({ recipientName, actorName, contractTitle, preview, link }),
        text: buildMentionText({ recipientName, actorName, contractTitle, preview, link }),
      });
    } catch (error) {
      // best-effort: 발송 실패가 호출부(코멘트 저장·인앱 알림) 흐름을 깨지 않게 swallow.
      this.logger.error(`[mail] 멘션 이메일 발송 실패 to=${to}`, error as Error);
    }
  }
}

interface MentionTemplateParams {
  recipientName: string;
  actorName: string;
  contractTitle: string;
  preview: string;
  link: string;
}

// 이메일 HTML 은 인라인 스타일이 표준(메일 클라이언트 호환). vanilla-extract 규칙 무관.
const buildMentionHtml = (p: MentionTemplateParams): string => {
  const { recipientName, actorName, contractTitle, preview, link } = p;
  return `<!DOCTYPE html>
<html lang="ko">
  <body style="margin:0;padding:24px;background-color:#f4f5f7;font-family:Arial,'Apple SD Gothic Neo',sans-serif;color:#1a1a1a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background-color:#ffffff;border-radius:8px;overflow:hidden;">
      <tr>
        <td style="padding:24px 28px;">
          <p style="margin:0 0 12px;font-size:14px;color:#6b7280;">${recipientName}님, 안녕하세요.</p>
          <h1 style="margin:0 0 16px;font-size:18px;line-height:1.4;">${actorName}님이 [${contractTitle}] 계약 코멘트에서 회원님을 멘션했습니다.</h1>
          <blockquote style="margin:0 0 20px;padding:12px 16px;background-color:#f4f5f7;border-left:3px solid #d1d5db;border-radius:4px;font-size:14px;color:#374151;white-space:pre-wrap;">${preview}</blockquote>
          <a href="${link}" style="display:inline-block;padding:10px 20px;background-color:#2563eb;color:#ffffff;text-decoration:none;border-radius:6px;font-size:14px;">계약에서 코멘트 보기</a>
          <p style="margin:20px 0 0;font-size:12px;color:#9ca3af;">버튼이 동작하지 않으면 아래 링크를 복사하세요:<br />${link}</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
};

const buildMentionText = (p: MentionTemplateParams): string => {
  const { recipientName, actorName, contractTitle, preview, link } = p;
  return [
    `${recipientName}님, 안녕하세요.`,
    "",
    `${actorName}님이 [${contractTitle}] 계약 코멘트에서 회원님을 멘션했습니다.`,
    "",
    `"${preview}"`,
    "",
    `계약에서 코멘트 보기: ${link}`,
  ].join("\n");
};
