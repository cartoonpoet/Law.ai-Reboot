import { Logger } from "@nestjs/common";
import { Resend } from "resend";
import { MailService, SendMentionEmailParams } from "./mail.service";

/**
 * MailService 단위 테스트.
 *
 * - resend SDK(default-ish export class `Resend`)를 jest.mock 으로 대체.
 *   생성자에서 `new Resend(apiKey)` 호출 시 stub 인스턴스(`{ emails: { send } }`)를 반환하게 한다.
 * - 키 분기는 생성자에서 `process.env.RESEND_API_KEY` 로 결정되므로, 각 케이스에서
 *   env 를 세팅한 뒤 MailService 를 새로 생성한다(생성자 분기).
 * - best-effort: send 가 reject 해도 sendMentionEmail 은 throw 하지 않는다(swallow + logger.error).
 */

// resend 클래스 목 — 인스턴스에 emails.send 를 노출한다.
const sendMock = jest.fn();
jest.mock("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: sendMock },
  })),
}));

const ResendMock = Resend as unknown as jest.Mock;

const baseParams: SendMentionEmailParams = {
  to: "recipient@example.com",
  recipientName: "수신자",
  actorName: "작성자",
  contractTitle: "비밀유지계약",
  contractId: "contract-1",
  preview: "확인 부탁드립니다",
};

describe("MailService", () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    // env 를 케이스마다 격리(원본 복제 후 변경).
    process.env = { ...ORIGINAL_ENV };
    sendMock.mockResolvedValue({ data: { id: "email-1" }, error: null });
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  describe("RESEND_API_KEY 있을 때", () => {
    it("Resend 클라이언트를 키로 생성하고 sendMentionEmail 이 emails.send 를 호출한다", async () => {
      process.env.RESEND_API_KEY = "re_test_key";
      process.env.MAIL_FROM = "notify@law.ai";
      process.env.APP_WEB_URL = "https://app.law.ai";

      const service = new MailService();
      // 키로 Resend 인스턴스 1회 생성.
      expect(ResendMock).toHaveBeenCalledTimes(1);
      expect(ResendMock).toHaveBeenCalledWith("re_test_key");

      await service.sendMentionEmail(baseParams);

      expect(sendMock).toHaveBeenCalledTimes(1);
      const payload = sendMock.mock.calls[0][0] as {
        from: string;
        to: string;
        subject: string;
        html: string;
        text: string;
      };
      // from/to/subject 검증 + html/text 본문에 핵심 값 포함.
      expect(payload.from).toBe("notify@law.ai");
      expect(payload.to).toBe("recipient@example.com");
      expect(payload.subject).toContain("작성자");
      expect(payload.subject).toContain("멘션");
      expect(payload.html).toContain("비밀유지계약");
      expect(payload.html).toContain("확인 부탁드립니다");
      // 링크는 APP_WEB_URL + /contract/:id.
      expect(payload.html).toContain("https://app.law.ai/contract/contract-1");
      expect(payload.text).toContain("비밀유지계약");
      expect(payload.text).toContain("https://app.law.ai/contract/contract-1");
    });

    it("MAIL_FROM 미설정 시 from 은 onboarding@resend.dev 폴백을 사용한다", async () => {
      process.env.RESEND_API_KEY = "re_test_key";
      delete process.env.MAIL_FROM;

      const service = new MailService();
      await service.sendMentionEmail(baseParams);

      const payload = sendMock.mock.calls[0][0] as { from: string };
      expect(payload.from).toBe("onboarding@resend.dev");
    });
  });

  describe("RESEND_API_KEY 없을 때(스텁 모드)", () => {
    it("Resend 클라이언트를 만들지 않고 실제 send 를 호출하지 않으며 로그 스텁만 남긴다", async () => {
      delete process.env.RESEND_API_KEY;
      const logSpy = jest
        .spyOn(Logger.prototype, "log")
        .mockImplementation(() => undefined);

      const service = new MailService();
      // 키 없음 → Resend 미생성.
      expect(ResendMock).not.toHaveBeenCalled();

      await service.sendMentionEmail(baseParams);

      // 실제 발송 skip.
      expect(sendMock).not.toHaveBeenCalled();
      // 스텁 로그 1회 이상(생성자 + 발송).
      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });
  });

  describe("발송 실패(best-effort)", () => {
    it("emails.send 가 reject 해도 throw 하지 않고 logger.error 로만 기록한다", async () => {
      process.env.RESEND_API_KEY = "re_test_key";
      sendMock.mockRejectedValueOnce(new Error("Resend 503"));
      const errorSpy = jest
        .spyOn(Logger.prototype, "error")
        .mockImplementation(() => undefined);

      const service = new MailService();

      // throw 안 함(resolve).
      await expect(service.sendMentionEmail(baseParams)).resolves.toBeUndefined();
      expect(sendMock).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });
  });
});
