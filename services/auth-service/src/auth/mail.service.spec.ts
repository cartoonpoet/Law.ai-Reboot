import { Logger } from "@nestjs/common";
import { Resend } from "resend";
import { MailService } from "./mail.service";

/**
 * MailService 단위 테스트.
 * - resend SDK 를 jest.mock 으로 대체해 `new Resend(key)` 가 stub 인스턴스를 돌려주게 한다.
 * - 키 분기는 생성자에서 정해지므로 케이스마다 env 를 세팅한 뒤 새로 만든다.
 */
const sendMock = jest.fn();
jest.mock("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({ emails: { send: sendMock } })),
}));

const ResendMock = Resend as unknown as jest.Mock;

describe("MailService", () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...ORIGINAL_ENV };
    sendMock.mockResolvedValue({ data: { id: "email-1" }, error: null });
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  describe("RESEND_API_KEY 있을 때", () => {
    beforeEach(() => {
      process.env.RESEND_API_KEY = "re_test_key";
      process.env.MAIL_FROM = "notify@law.ai";
    });

    it("비밀번호 재설정 메일에 링크와 만료 시간을 담아 보낸다", async () => {
      process.env.PASSWORD_RESET_TTL_MIN = "45";
      const service = new MailService();
      expect(ResendMock).toHaveBeenCalledWith("re_test_key");

      await service.sendPasswordResetLink("user@example.com", "https://app.law.ai/reset-password?token=t1");

      const payload = sendMock.mock.calls[0][0] as { from: string; to: string; subject: string; html: string; text: string };
      expect(payload.from).toBe("notify@law.ai");
      expect(payload.to).toBe("user@example.com");
      expect(payload.subject).toContain("비밀번호 재설정");
      expect(payload.html).toContain("https://app.law.ai/reset-password?token=t1");
      expect(payload.html).toContain("45분");
      expect(payload.text).toContain("https://app.law.ai/reset-password?token=t1");
    });

    it("초대 메일에 회사 이름과 초대 링크를 담아 보낸다", async () => {
      const service = new MailService();
      await service.sendInviteLink("new@example.com", "https://app.law.ai/invite?token=t2", "휴맥스아이티");

      const payload = sendMock.mock.calls[0][0] as { to: string; subject: string; html: string; text: string };
      expect(payload.to).toBe("new@example.com");
      expect(payload.subject).toContain("휴맥스아이티");
      expect(payload.html).toContain("휴맥스아이티");
      expect(payload.html).toContain("https://app.law.ai/invite?token=t2");
      expect(payload.text).toContain("https://app.law.ai/invite?token=t2");
    });

    it("MAIL_FROM 이 없으면 onboarding@resend.dev 로 보낸다", async () => {
      delete process.env.MAIL_FROM;
      const service = new MailService();
      await service.sendPasswordResetLink("user@example.com", "https://app.law.ai/reset-password?token=t1");

      expect((sendMock.mock.calls[0][0] as { from: string }).from).toBe("onboarding@resend.dev");
    });

    it("발송이 실패해도 throw 하지 않고 기록만 남긴다", async () => {
      sendMock.mockRejectedValueOnce(new Error("Resend 503"));
      const errorSpy = jest.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
      const service = new MailService();

      await expect(service.sendInviteLink("new@example.com", "https://app.law.ai/invite?token=t2", "넥스트랩")).resolves.toBeUndefined();
      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });
  });

  describe("RESEND_API_KEY 없을 때(스텁 모드)", () => {
    it("실제로 보내지 않고 링크를 로그로만 남긴다", async () => {
      delete process.env.RESEND_API_KEY;
      const logSpy = jest.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);

      const service = new MailService();
      await service.sendPasswordResetLink("user@example.com", "https://app.law.ai/reset-password?token=t1");
      await service.sendInviteLink("new@example.com", "https://app.law.ai/invite?token=t2", "넥스트랩");

      expect(ResendMock).not.toHaveBeenCalled();
      expect(sendMock).not.toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });
  });
});
