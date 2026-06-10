import { Test } from "@nestjs/testing";
import { of } from "rxjs";
import { JwtService } from "@nestjs/jwt";
import { RpcException } from "@nestjs/microservices";
import { AuthService } from "./auth.service";
import { PasswordService } from "./password.service";
import { USER_PATTERNS } from "@lawai/contracts";

describe("AuthService", () => {
  let service: AuthService;
  const userClient = { send: jest.fn() };
  const passwords = {
    hash: jest.fn(),
    verify: jest.fn(),
  };
  const jwt = { signAsync: jest.fn(), verifyAsync: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: "USER_CLIENT", useValue: userClient },
        { provide: PasswordService, useValue: passwords },
        { provide: JwtService, useValue: jwt },
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
});
