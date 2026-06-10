import { Test } from "@nestjs/testing";
import { of } from "rxjs";
import { JwtService } from "@nestjs/jwt";
import { RpcException } from "@nestjs/microservices";
import { AuthService } from "./auth.service";
import { PasswordService } from "./password.service";
import { MailService } from "./mail.service";
import { USER_PATTERNS } from "@lawai/contracts";

describe("AuthService", () => {
  let service: AuthService;
  const userClient = { send: jest.fn() };
  const passwords = {
    hash: jest.fn(),
    verify: jest.fn(),
  };
  const jwt = { signAsync: jest.fn(), verifyAsync: jest.fn() };
  const mail = { sendPasswordResetLink: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: "USER_CLIENT", useValue: userClient },
        { provide: PasswordService, useValue: passwords },
        { provide: JwtService, useValue: jwt },
        { provide: MailService, useValue: mail },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
  });

  it("signup은 해시 후 user.create를 호출하고 토큰을 발급한다", async () => {
    passwords.hash.mockResolvedValue("hashed");
    userClient.send.mockReturnValue(
      of({
        id: "u1",
        email: "a@b.com",
        name: "A",
        passwordHash: "hashed",
        createdAt: "2026-01-01T00:00:00.000Z",
      }),
    );
    jwt.signAsync.mockResolvedValue("token");

    const result = await service.signup({
      email: "a@b.com",
      name: "A",
      password: "pw",
    });

    expect(passwords.hash).toHaveBeenCalledWith("pw");
    expect(userClient.send).toHaveBeenCalledWith(USER_PATTERNS.CREATE, {
      email: "a@b.com",
      name: "A",
      passwordHash: "hashed",
    });
    expect(result.tokens.accessToken).toBe("token");
    expect(result.user).toEqual({
      id: "u1",
      email: "a@b.com",
      name: "A",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    expect(JSON.stringify(result)).not.toContain("hashed");
  });

  it("login은 비밀번호 검증 성공 시 토큰을 발급한다", async () => {
    userClient.send.mockReturnValue(
      of({
        id: "u1",
        email: "a@b.com",
        name: "A",
        passwordHash: "hashed",
        createdAt: "2026-01-01T00:00:00.000Z",
      }),
    );
    passwords.verify.mockResolvedValue(true);
    jwt.signAsync.mockResolvedValue("token");

    const result = await service.login({ email: "a@b.com", password: "pw" });
    expect(passwords.verify).toHaveBeenCalledWith("hashed", "pw");
    expect(result.tokens.accessToken).toBe("token");
  });

  it("login은 사용자가 없으면 RpcException", async () => {
    userClient.send.mockReturnValue(of(null));
    await expect(
      service.login({ email: "x@y.com", password: "pw" }),
    ).rejects.toBeInstanceOf(RpcException);
  });

  it("login은 비밀번호가 틀리면 RpcException", async () => {
    userClient.send.mockReturnValue(
      of({
        id: "u1",
        email: "a@b.com",
        name: "A",
        passwordHash: "hashed",
        createdAt: "2026-01-01T00:00:00.000Z",
      }),
    );
    passwords.verify.mockResolvedValue(false);
    await expect(
      service.login({ email: "a@b.com", password: "bad" }),
    ).rejects.toBeInstanceOf(RpcException);
  });

  it("requestPasswordReset는 사용자가 있으면 토큰을 만들고 메일을 보낸다", async () => {
    userClient.send.mockImplementation((pattern: string) =>
      pattern === USER_PATTERNS.FIND_BY_EMAIL
        ? of({
            id: "u1",
            email: "a@b.com",
            name: "A",
            passwordHash: "hashed",
            createdAt: "2026-01-01T00:00:00.000Z",
          })
        : of(undefined),
    );

    const result = await service.requestPasswordReset({ email: "a@b.com" });

    expect(result).toEqual({ ok: true });
    expect(userClient.send).toHaveBeenCalledWith(
      USER_PATTERNS.CREATE_RESET_TOKEN,
      expect.objectContaining({ userId: "u1" }),
    );
    expect(mail.sendPasswordResetLink).toHaveBeenCalledWith(
      "a@b.com",
      expect.stringContaining("/reset-password?token="),
    );
  });

  it("requestPasswordReset는 사용자가 없어도 ok를 반환하고 메일을 보내지 않는다 (열거 방지)", async () => {
    userClient.send.mockReturnValue(of(null));

    const result = await service.requestPasswordReset({ email: "x@y.com" });

    expect(result).toEqual({ ok: true });
    expect(mail.sendPasswordResetLink).not.toHaveBeenCalled();
    expect(userClient.send).not.toHaveBeenCalledWith(
      USER_PATTERNS.CREATE_RESET_TOKEN,
      expect.anything(),
    );
  });

  it("confirmPasswordReset는 유효 토큰이면 새 비밀번호를 저장한다", async () => {
    userClient.send.mockImplementation((pattern: string) =>
      pattern === USER_PATTERNS.CONSUME_RESET_TOKEN
        ? of({ userId: "u1" })
        : of(undefined),
    );
    passwords.hash.mockResolvedValue("newhash");

    const result = await service.confirmPasswordReset({
      token: "raw",
      newPassword: "newpw1234!",
    });

    expect(result).toEqual({ ok: true });
    expect(passwords.hash).toHaveBeenCalledWith("newpw1234!");
    expect(userClient.send).toHaveBeenCalledWith(USER_PATTERNS.UPDATE_PASSWORD, {
      userId: "u1",
      passwordHash: "newhash",
    });
  });

  it("confirmPasswordReset는 토큰이 유효하지 않으면 RpcException", async () => {
    userClient.send.mockReturnValue(of(null));
    await expect(
      service.confirmPasswordReset({ token: "bad", newPassword: "newpw1234!" }),
    ).rejects.toBeInstanceOf(RpcException);
  });
});
