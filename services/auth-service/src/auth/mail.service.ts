import { Injectable, Logger } from "@nestjs/common";
import { Resend } from "resend";

/**
 * 인증 메일 발송(Resend) — 비밀번호 재설정 링크, 고객사 초대 링크.
 * - RESEND_API_KEY 가 없으면 스텁 모드(실제 발송 skip, 링크를 로그로) — dev/CI 안전.
 * - best-effort: 발송이 실패해도 throw 하지 않는다(재설정 요청·초대 흐름을 깨지 않게 logger.error 만).
 */
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

  async sendPasswordResetLink(email: string, resetLink: string): Promise<void> {
    if (!this.resend) {
      this.logger.log(`[mail stub] 비밀번호 재설정 ${email} → ${resetLink}`);
      return;
    }
    const ttlMin = Number(process.env.PASSWORD_RESET_TTL_MIN ?? 30);
    const lines = [
      "비밀번호를 새로 정하시려면 아래 버튼을 눌러 주세요.",
      `이 링크는 ${ttlMin}분 동안만 쓸 수 있어요.`,
      "직접 요청하지 않으셨다면 이 메일은 무시하셔도 됩니다.",
    ];
    await this.send({
      to: email,
      subject: "[Law.ai] 비밀번호 재설정 안내",
      heading: "비밀번호 재설정",
      lines,
      link: resetLink,
      linkLabel: "비밀번호 재설정하기",
    });
  }

  async sendInviteLink(email: string, inviteLink: string, tenantName: string): Promise<void> {
    if (!this.resend) {
      this.logger.log(`[mail stub] 고객사 초대 ${tenantName} → ${email} → ${inviteLink}`);
      return;
    }
    const ttlDays = Number(process.env.INVITE_TTL_DAYS ?? 7);
    const lines = [
      `${tenantName}에서 Law.ai 계정을 만들도록 초대했어요.`,
      `아래 버튼을 눌러 이름과 비밀번호를 정하면 바로 쓸 수 있어요. 이 링크는 ${ttlDays}일 동안만 쓸 수 있어요.`,
    ];
    await this.send({
      to: email,
      subject: `[Law.ai] ${tenantName} 초대`,
      heading: `${tenantName} 초대`,
      lines,
      link: inviteLink,
      linkLabel: "초대 수락하기",
    });
  }

  private async send(params: MailParams): Promise<void> {
    const from = process.env.MAIL_FROM ?? "onboarding@resend.dev";
    try {
      await this.resend?.emails.send({
        from,
        to: params.to,
        subject: params.subject,
        html: buildHtml(params),
        text: buildText(params),
      });
    } catch (error) {
      // best-effort: 발송 실패가 호출부(재설정 요청·초대) 흐름을 깨지 않게 swallow.
      this.logger.error(`[mail] 메일 발송 실패 to=${params.to}`, error as Error);
    }
  }
}

interface MailParams {
  to: string;
  subject: string;
  heading: string;
  lines: string[];
  link: string;
  linkLabel: string;
}

// 이메일 HTML 은 인라인 스타일이 표준(메일 클라이언트 호환). vanilla-extract 규칙 무관.
const buildHtml = ({ heading, lines, link, linkLabel }: MailParams): string => `<!DOCTYPE html>
<html lang="ko">
  <body style="margin:0;padding:24px;background-color:#f4f5f7;font-family:Arial,'Apple SD Gothic Neo',sans-serif;color:#1a1a1a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background-color:#ffffff;border-radius:8px;overflow:hidden;">
      <tr>
        <td style="padding:24px 28px;">
          <h1 style="margin:0 0 16px;font-size:18px;line-height:1.4;">${heading}</h1>
          ${lines.map((line) => `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#374151;">${line}</p>`).join("\n          ")}
          <a href="${link}" style="display:inline-block;margin-top:8px;padding:10px 20px;background-color:#2563eb;color:#ffffff;text-decoration:none;border-radius:6px;font-size:14px;">${linkLabel}</a>
          <p style="margin:20px 0 0;font-size:12px;color:#9ca3af;">버튼이 동작하지 않으면 아래 링크를 복사하세요:<br />${link}</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

const buildText = ({ heading, lines, link, linkLabel }: MailParams): string =>
  [heading, "", ...lines, "", `${linkLabel}: ${link}`].join("\n");
