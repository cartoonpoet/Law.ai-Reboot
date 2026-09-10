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
  const jwtMock = { signAsync: jest.fn(), verifyAsync: jest.fn() };
  const mail = { sendPasswordResetLink: jest.fn(), sendInviteLink: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: "USER_CLIENT", useValue: userClient },
        { provide: PasswordService, useValue: passwords },
        { provide: JwtService, useValue: jwtMock },
        { provide: MailService, useValue: mail },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
  });

  // ─── signup ────────────────────────────────────────────────────────────────

  it("signup은 해시 후 user.create를 호출하고 토큰을 발급한다", async () => {
    passwords.hash.mockResolvedValue("hashed");
    userClient.send.mockImplementation((pattern: string) => {
      if (pattern === USER_PATTERNS.CREATE) {
        return of({
          id: "u1",
          email: "a@b.com",
          name: "A",
          passwordHash: "hashed",
          isSystemAdmin: false,
          departmentId: null,
          departmentName: null,
          createdAt: "2026-01-01T00:00:00.000Z",
        });
      }
      if (pattern === USER_PATTERNS.FIND_MEMBERSHIPS) {
        // 신규 가입자는 멤버십 0개 — allowEmpty=true 이므로 403 없이 통과
        return of({ isSystemAdmin: false, memberships: [] });
      }
      return of(null);
    });
    jwtMock.signAsync.mockResolvedValue("token");

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
      isSystemAdmin: false,
      departmentId: null,
      departmentName: null,
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    expect(JSON.stringify(result)).not.toContain("hashed");
  });

  // ─── login ─────────────────────────────────────────────────────────────────

  it("login: 첫 멤버십을 활성 테넌트로 토큰 클레임에 넣는다", async () => {
    userClient.send.mockImplementation((pattern: string) => {
      if (pattern === USER_PATTERNS.FIND_BY_EMAIL) {
        return of({
          id: "u1",
          email: "a@b.com",
          name: "A",
          passwordHash: "hashed",
          isSystemAdmin: false,
          departmentId: null,
          departmentName: null,
          createdAt: "2026-01-01T00:00:00.000Z",
        });
      }
      if (pattern === USER_PATTERNS.FIND_MEMBERSHIPS) {
        return of({
          isSystemAdmin: false,
          memberships: [{ tenantId: "t1", tenantName: "A사", role: "inHouseCounsel", tenantStatus: "active" }],
        });
      }
      return of(null);
    });
    passwords.verify.mockResolvedValue(true);
    // 실제 JWT 서명을 쓰기 위해 real signAsync 구현
    jwtMock.signAsync.mockImplementation(
      (payload: Record<string, unknown>) =>
        Promise.resolve(
          // jsonwebtoken 없이 base64 인코딩으로 페이로드 확인 가능하게 만듦
          "header." + Buffer.from(JSON.stringify(payload)).toString("base64url") + ".sig",
        ),
    );

    const result = await service.login({ email: "a@b.com", password: "pw" });

    const rawPayload = JSON.parse(
      Buffer.from(result.tokens.accessToken.split(".")[1], "base64url").toString(),
    );
    expect(rawPayload.activeTenantId).toBe("t1");
    expect(rawPayload.activeRole).toBe("inHouseCounsel");
    expect(rawPayload.isSystemAdmin).toBe(false);
  });

  it("login은 비밀번호 검증 성공 시 토큰을 발급한다", async () => {
    userClient.send.mockImplementation((pattern: string) => {
      if (pattern === USER_PATTERNS.FIND_BY_EMAIL) {
        return of({
          id: "u1",
          email: "a@b.com",
          name: "A",
          passwordHash: "hashed",
          isSystemAdmin: false,
          departmentId: null,
          departmentName: null,
          createdAt: "2026-01-01T00:00:00.000Z",
        });
      }
      if (pattern === USER_PATTERNS.FIND_MEMBERSHIPS) {
        return of({
          isSystemAdmin: false,
          memberships: [{ tenantId: "t1", tenantName: "A사", role: "inHouseCounsel", tenantStatus: "active" }],
        });
      }
      return of(null);
    });
    passwords.verify.mockResolvedValue(true);
    jwtMock.signAsync.mockResolvedValue("token");

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
    userClient.send.mockImplementation((pattern: string) => {
      if (pattern === USER_PATTERNS.FIND_BY_EMAIL) {
        return of({
          id: "u1",
          email: "a@b.com",
          name: "A",
          passwordHash: "hashed",
          isSystemAdmin: false,
          departmentId: null,
          departmentName: null,
          createdAt: "2026-01-01T00:00:00.000Z",
        });
      }
      return of(null);
    });
    passwords.verify.mockResolvedValue(false);
    await expect(
      service.login({ email: "a@b.com", password: "bad" }),
    ).rejects.toBeInstanceOf(RpcException);
  });

  it("멤버십 0개 + 비admin → 로그인 거부", async () => {
    userClient.send.mockImplementation((pattern: string) => {
      if (pattern === USER_PATTERNS.FIND_BY_EMAIL) {
        return of({
          id: "u1",
          email: "a@b.com",
          name: "A",
          passwordHash: "hashed",
          isSystemAdmin: false,
          departmentId: null,
          departmentName: null,
          createdAt: "2026-01-01T00:00:00.000Z",
        });
      }
      if (pattern === USER_PATTERNS.FIND_MEMBERSHIPS) {
        return of({ isSystemAdmin: false, memberships: [] });
      }
      return of(null);
    });
    passwords.verify.mockResolvedValue(true);
    await expect(
      service.login({ email: "a@b.com", password: "pw" }),
    ).rejects.toBeInstanceOf(RpcException);
  });

  // ─── switchTenant ──────────────────────────────────────────────────────────

  it("switchTenant: 멤버 아닌 테넌트면 403 RpcException", async () => {
    userClient.send.mockImplementation((pattern: string) => {
      if (pattern === USER_PATTERNS.FIND_BY_ID) {
        return of({
          id: "u1",
          email: "a@b.com",
          name: "A",
          passwordHash: "hashed",
          isSystemAdmin: false,
          departmentId: null,
          departmentName: null,
          createdAt: "2026-01-01T00:00:00.000Z",
        });
      }
      if (pattern === USER_PATTERNS.FIND_MEMBERSHIPS) {
        return of({
          isSystemAdmin: false,
          memberships: [{ tenantId: "t1", tenantName: "A사", role: "inHouseCounsel", tenantStatus: "active" }],
        });
      }
      return of(null);
    });
    // t2 는 멤버십에 없음
    await expect(
      service.switchTenant({ userId: "u1", tenantId: "t2" }),
    ).rejects.toBeInstanceOf(RpcException);
  });

  it("switchTenant: 멤버인 테넌트면 새 토큰 발급", async () => {
    userClient.send.mockImplementation((pattern: string) => {
      if (pattern === USER_PATTERNS.FIND_BY_ID) {
        return of({
          id: "u1",
          email: "a@b.com",
          name: "A",
          passwordHash: "hashed",
          isSystemAdmin: false,
          departmentId: null,
          departmentName: null,
          createdAt: "2026-01-01T00:00:00.000Z",
        });
      }
      if (pattern === USER_PATTERNS.FIND_MEMBERSHIPS) {
        return of({
          isSystemAdmin: false,
          memberships: [{ tenantId: "t1", tenantName: "A사", role: "contractManager", tenantStatus: "active" }],
        });
      }
      return of(null);
    });
    jwtMock.signAsync.mockResolvedValue("switched-token");
    const result = await service.switchTenant({ userId: "u1", tenantId: "t1" });
    expect(result.tokens.accessToken).toBe("switched-token");
  });

  // ─── myTenants ─────────────────────────────────────────────────────────────

  it("myTenants: 사용자의 멤버십 목록을 반환한다", async () => {
    userClient.send.mockImplementation((pattern: string) => {
      if (pattern === USER_PATTERNS.FIND_MEMBERSHIPS) {
        return of({
          isSystemAdmin: false,
          memberships: [
            { tenantId: "t1", tenantName: "A사", role: "inHouseCounsel", tenantStatus: "active" },
            { tenantId: "t2", tenantName: "B사", role: "general", tenantStatus: "active" },
          ],
        });
      }
      return of(null);
    });
    const result = await service.myTenants({ userId: "u1" });
    expect(result.tenants).toHaveLength(2);
    expect(result.tenants[0].tenantId).toBe("t1");
    expect(result.tenants[1].tenantId).toBe("t2");
  });

  // ─── requestPasswordReset ──────────────────────────────────────────────────

  it("requestPasswordReset는 사용자가 있으면 토큰을 만들고 메일을 보낸다", async () => {
    userClient.send.mockImplementation((pattern: string) =>
      pattern === USER_PATTERNS.FIND_BY_EMAIL
        ? of({
            id: "u1",
            email: "a@b.com",
            name: "A",
            passwordHash: "hashed",
            isSystemAdmin: false,
            departmentId: null,
            departmentName: null,
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

  // ─── confirmPasswordReset ──────────────────────────────────────────────────

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

  // ─── refresh ───────────────────────────────────────────────────────────────

  it("refresh는 유효한 refreshToken이면 새 access+refresh를 둘 다 발급한다", async () => {
    jwtMock.verifyAsync.mockResolvedValue({ sub: "u1", email: "a@b.com", isSystemAdmin: false });
    jwtMock.signAsync
      .mockResolvedValueOnce("newAccess")
      .mockResolvedValueOnce("newRefresh");

    const tokens = await service.refresh({ refreshToken: "validRefresh" });

    expect(jwtMock.verifyAsync).toHaveBeenCalledWith("validRefresh", {
      secret: process.env.JWT_REFRESH_SECRET,
    });
    // 슬라이딩 회전: access·refresh 둘 다 재발급.
    expect(jwtMock.signAsync).toHaveBeenCalledTimes(2);
    expect(tokens).toEqual({
      accessToken: "newAccess",
      refreshToken: "newRefresh",
    });
  });

  it("refresh는 activeTenantId/activeRole 클레임을 그대로 전파한다", async () => {
    jwtMock.verifyAsync.mockResolvedValue({
      sub: "u1",
      email: "a@b.com",
      isSystemAdmin: false,
      activeTenantId: "t1",
      activeRole: "inHouseCounsel",
    });
    jwtMock.signAsync
      .mockResolvedValueOnce("newAccess")
      .mockResolvedValueOnce("newRefresh");

    await service.refresh({ refreshToken: "validRefresh" });

    expect(jwtMock.signAsync).toHaveBeenCalledWith(
      expect.objectContaining({ activeTenantId: "t1", activeRole: "inHouseCounsel" }),
      expect.anything(),
    );
  });

  it("refresh는 위조/만료 refreshToken이면 RpcException(401)", async () => {
    jwtMock.verifyAsync.mockRejectedValue(new Error("invalid signature"));

    await expect(
      service.refresh({ refreshToken: "forged" }),
    ).rejects.toBeInstanceOf(RpcException);
    expect(jwtMock.signAsync).not.toHaveBeenCalled();
  });

  // ─── suspended 차단 (Spec 3) ──────────────────────────────────────────────

  const suspendedUser = {
    id: "u9",
    email: "s@b.com",
    name: "S",
    passwordHash: "hashed",
    isSystemAdmin: false,
    departmentId: null,
    departmentName: null,
    createdAt: "2026-01-01T00:00:00.000Z",
  };

  it("모든 멤버십이 suspended 면 로그인이 403으로 거부된다", async () => {
    passwords.verify.mockResolvedValue(true);
    userClient.send.mockImplementation((pattern: string) => {
      if (pattern === USER_PATTERNS.FIND_BY_EMAIL) return of(suspendedUser);
      if (pattern === USER_PATTERNS.FIND_MEMBERSHIPS) {
        return of({
          isSystemAdmin: false,
          memberships: [
            { tenantId: "t1", tenantName: "정지사", role: "general", tenantStatus: "suspended" },
          ],
        });
      }
      return of(null);
    });
    const err = await service
      .login({ email: "s@b.com", password: "pw" })
      .catch((e: RpcException) => e);
    expect(err).toBeInstanceOf(RpcException);
    expect((err as RpcException).getError()).toMatchObject({
      status: 403,
      message: "이용이 정지된 회사입니다. 관리자에게 문의하세요.",
    });
  });

  it("suspended 와 active 가 섞이면 active 쪽을 활성 테넌트로 선택한다", async () => {
    passwords.verify.mockResolvedValue(true);
    userClient.send.mockImplementation((pattern: string) => {
      if (pattern === USER_PATTERNS.FIND_BY_EMAIL) return of(suspendedUser);
      if (pattern === USER_PATTERNS.FIND_MEMBERSHIPS) {
        return of({
          isSystemAdmin: false,
          memberships: [
            { tenantId: "t1", tenantName: "정지사", role: "general", tenantStatus: "suspended" },
            { tenantId: "t2", tenantName: "정상사", role: "general", tenantStatus: "active" },
          ],
        });
      }
      return of(null);
    });
    jwtMock.signAsync.mockResolvedValue("token");

    await service.login({ email: "s@b.com", password: "pw" });

    expect(jwtMock.signAsync.mock.calls[0][0]).toMatchObject({ activeTenantId: "t2" });
  });

  it("suspended 테넌트로 switch-tenant 하면 403", async () => {
    userClient.send.mockImplementation((pattern: string) => {
      if (pattern === USER_PATTERNS.FIND_BY_ID) return of(suspendedUser);
      if (pattern === USER_PATTERNS.FIND_MEMBERSHIPS) {
        return of({
          isSystemAdmin: false,
          memberships: [
            { tenantId: "t1", tenantName: "정지사", role: "general", tenantStatus: "suspended" },
            { tenantId: "t2", tenantName: "정상사", role: "general", tenantStatus: "active" },
          ],
        });
      }
      return of(null);
    });
    const err = await service
      .switchTenant({ userId: "u9", tenantId: "t1" })
      .catch((e: RpcException) => e);
    expect(err).toBeInstanceOf(RpcException);
    expect((err as RpcException).getError()).toMatchObject({ status: 403 });
  });

  // ─── 온보딩 초대 (Spec 4) ─────────────────────────────────────────────────

  it("inviteMembers: 권한 없는 역할이면 403", async () => {
    const err = await service
      .inviteMembers({
        tenantId: "t1", invitedById: "u1", inviterRole: "general", isSystemAdmin: false,
        emails: ["a@x.com"], role: "general",
      })
      .catch((e: RpcException) => e);
    expect(err).toBeInstanceOf(RpcException);
    expect((err as RpcException).getError()).toMatchObject({ status: 403 });
  });

  it("inviteMembers: 담당자는 초대를 발급하고 스킵을 집계한다", async () => {
    userClient.send.mockImplementation((pattern: string, payload: { email?: string }) => {
      if (pattern === USER_PATTERNS.CREATE_INVITATION) {
        return of({ created: payload.email !== "dup@x.com" });
      }
      if (pattern === USER_PATTERNS.FIND_MEMBERSHIPS) {
        return of({
          isSystemAdmin: false,
          memberships: [{ tenantId: "t1", tenantName: "D물산", role: "contractManager", tenantStatus: "active" }],
        });
      }
      return of(null);
    });
    const res = await service.inviteMembers({
      tenantId: "t1", invitedById: "u1", inviterRole: "contractManager", isSystemAdmin: false,
      emails: ["new@x.com", "dup@x.com"], role: "general",
    });
    expect(res).toEqual({ sent: 1, skipped: ["dup@x.com"] });
    expect(mail.sendInviteLink).toHaveBeenCalledTimes(1);
  });

  it("getInvite: 무효 토큰이면 400", async () => {
    userClient.send.mockImplementation((pattern: string) =>
      pattern === USER_PATTERNS.FIND_INVITATION ? of(null) : of(null),
    );
    const err = await service.getInvite({ token: "bad" }).catch((e: RpcException) => e);
    expect(err).toBeInstanceOf(RpcException);
    expect((err as RpcException).getError()).toMatchObject({ status: 400 });
  });

  it("acceptInvite: 신규 사용자는 토큰까지 발급된다", async () => {
    passwords.hash.mockResolvedValue("ph");
    jwtMock.signAsync.mockResolvedValue("token");
    userClient.send.mockImplementation((pattern: string) => {
      if (pattern === USER_PATTERNS.ACCEPT_INVITATION) {
        return of({ tenantId: "t1", existingUser: false, userId: "nu1" });
      }
      if (pattern === USER_PATTERNS.FIND_BY_ID) {
        return of({
          id: "nu1", email: "new@x.com", name: "박준영", passwordHash: "ph",
          isSystemAdmin: false, departmentId: null, departmentName: null,
          createdAt: "2026-09-10T00:00:00.000Z",
        });
      }
      if (pattern === USER_PATTERNS.FIND_MEMBERSHIPS) {
        return of({
          isSystemAdmin: false,
          memberships: [{ tenantId: "t1", tenantName: "D물산", role: "general", tenantStatus: "active" }],
        });
      }
      return of(null);
    });
    const res = await service.acceptInvite({ token: "raw", name: "박준영", password: "pw12345678" });
    expect(res.existingUser).toBe(false);
    expect(res.tokens?.accessToken).toBe("token");
    expect(jwtMock.signAsync.mock.calls[0][0]).toMatchObject({ activeTenantId: "t1" });
  });

  it("acceptInvite: 기존 사용자는 existingUser=true 만 반환한다", async () => {
    passwords.hash.mockResolvedValue("ph");
    userClient.send.mockImplementation((pattern: string) => {
      if (pattern === USER_PATTERNS.ACCEPT_INVITATION) {
        return of({ tenantId: "t1", existingUser: true, userId: "eu1" });
      }
      return of(null);
    });
    const res = await service.acceptInvite({ token: "raw", name: "무시", password: "pw12345678" });
    expect(res).toEqual({ existingUser: true });
    expect(jwtMock.signAsync).not.toHaveBeenCalled();
  });

  it("adminCreateTenant: 테넌트 생성 후 담당자를 contractManager 로 초대한다", async () => {
    const calls: string[] = [];
    userClient.send.mockImplementation((pattern: string) => {
      calls.push(pattern);
      if (pattern === USER_PATTERNS.CREATE_TENANT) {
        return of({ id: "t9", name: "D물산", plan: "pro", status: "trial", createdAt: "x" });
      }
      if (pattern === USER_PATTERNS.CREATE_INVITATION) return of({ created: true });
      return of(null);
    });
    const res = await service.adminCreateTenant({
      actorId: "admin1", name: "D물산", plan: "pro", status: "trial",
      trialEndsAt: "2026-10-10T00:00:00.000Z", managerEmail: "lead@d.com",
    });
    expect(res.tenant.id).toBe("t9");
    expect(calls).toContain(USER_PATTERNS.CREATE_INVITATION);
    expect(mail.sendInviteLink).toHaveBeenCalledWith(
      "lead@d.com",
      expect.stringContaining("/invite?token="),
      "D물산",
    );
  });

});
