import { Inject, Injectable } from "@nestjs/common";
import { ClientProxy, RpcException } from "@nestjs/microservices";
import { JwtService, type JwtSignOptions } from "@nestjs/jwt";
import { randomBytes, createHash } from "node:crypto";
import { firstValueFrom } from "rxjs";
import {
  USER_PATTERNS,
  type SignupRequest,
  type LoginRequest,
  type ValidateTokenRequest,
  type RefreshRequest,
  type PublicUser,
  type AuthTokens,
  type UserWithHash,
  type JwtPayload,
  type PasswordResetRequestRequest,
  type PasswordResetConfirmRequest,
  type PasswordResetResult,
  type ConsumeResetTokenResult,
} from "@lawai/contracts";
import { PasswordService } from "./password.service";
import { MailService } from "./mail.service";

interface AuthResult {
  user: PublicUser;
  tokens: AuthTokens;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject("USER_CLIENT") private readonly userClient: ClientProxy,
    private readonly passwords: PasswordService,
    private readonly jwt: JwtService,
    private readonly mail: MailService,
  ) {}

  // 조회 가능하도록 재설정 토큰은 SHA-256으로 해시해 저장한다(argon2는 솔트로 조회 불가).
  private hashResetToken(raw: string): string {
    return createHash("sha256").update(raw).digest("hex");
  }

  async requestPasswordReset(
    req: PasswordResetRequestRequest,
  ): Promise<PasswordResetResult> {
    const user = await firstValueFrom(
      this.userClient.send<UserWithHash | null>(USER_PATTERNS.FIND_BY_EMAIL, {
        email: req.email,
      }),
    );

    // 이메일 존재 여부를 노출하지 않기 위해, 사용자가 있을 때만 토큰을 만들고
    // 응답은 항상 동일하게 성공으로 반환한다.
    if (user) {
      const rawToken = randomBytes(32).toString("hex");
      const ttlMin = Number(process.env.PASSWORD_RESET_TTL_MIN ?? 30);
      const expiresAt = new Date(Date.now() + ttlMin * 60_000).toISOString();
      await firstValueFrom(
        this.userClient.send(USER_PATTERNS.CREATE_RESET_TOKEN, {
          userId: user.id,
          tokenHash: this.hashResetToken(rawToken),
          expiresAt,
        }),
      );
      const webUrl = process.env.APP_WEB_URL ?? "http://localhost:5173";
      this.mail.sendPasswordResetLink(
        user.email,
        `${webUrl}/reset-password?token=${rawToken}`,
      );
    }

    return { ok: true };
  }

  async confirmPasswordReset(
    req: PasswordResetConfirmRequest,
  ): Promise<PasswordResetResult> {
    const consumed = await firstValueFrom(
      this.userClient.send<ConsumeResetTokenResult | null>(
        USER_PATTERNS.CONSUME_RESET_TOKEN,
        { tokenHash: this.hashResetToken(req.token) },
      ),
    );
    if (!consumed) {
      throw new RpcException({
        status: 400,
        message: "유효하지 않거나 만료된 재설정 링크입니다",
      });
    }
    const passwordHash = await this.passwords.hash(req.newPassword);
    await firstValueFrom(
      this.userClient.send(USER_PATTERNS.UPDATE_PASSWORD, {
        userId: consumed.userId,
        passwordHash,
      }),
    );
    return { ok: true };
  }

  async signup(req: SignupRequest): Promise<AuthResult> {
    const passwordHash = await this.passwords.hash(req.password);
    const created = await firstValueFrom(
      this.userClient.send<UserWithHash>(USER_PATTERNS.CREATE, {
        email: req.email,
        name: req.name,
        passwordHash,
      }),
    );
    return this.buildResult(created);
  }

  async login(req: LoginRequest): Promise<AuthResult> {
    const user = await firstValueFrom(
      this.userClient.send<UserWithHash | null>(USER_PATTERNS.FIND_BY_EMAIL, {
        email: req.email,
      }),
    );
    if (!user) {
      throw new RpcException({ status: 401, message: "이메일 또는 비밀번호가 올바르지 않습니다" });
    }
    const ok = await this.passwords.verify(user.passwordHash, req.password);
    if (!ok) {
      throw new RpcException({ status: 401, message: "이메일 또는 비밀번호가 올바르지 않습니다" });
    }
    return this.buildResult(user);
  }

  async validate(req: ValidateTokenRequest): Promise<JwtPayload> {
    try {
      return await this.jwt.verifyAsync<JwtPayload>(req.token, {
        secret: process.env.JWT_ACCESS_SECRET,
      });
    } catch {
      throw new RpcException({ status: 401, message: "유효하지 않은 토큰" });
    }
  }

  // 슬라이딩 회전: refresh token을 검증하고 새 access+refresh를 둘 다 재발급한다.
  async refresh(req: RefreshRequest): Promise<AuthTokens> {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(req.refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch {
      throw new RpcException({ status: 401, message: "세션이 만료되었습니다" });
    }
    return this.signTokens({ sub: payload.sub, email: payload.email });
  }

  private async signTokens(payload: JwtPayload): Promise<AuthTokens> {
    const accessOptions: JwtSignOptions = {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: (process.env.JWT_ACCESS_TTL ??
        "900s") as JwtSignOptions["expiresIn"],
    };
    const refreshOptions: JwtSignOptions = {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: (process.env.JWT_REFRESH_TTL ??
        "7d") as JwtSignOptions["expiresIn"],
    };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, accessOptions),
      this.jwt.signAsync(payload, refreshOptions),
    ]);
    return { accessToken, refreshToken };
  }

  private async buildResult(user: UserWithHash): Promise<AuthResult> {
    const payload: JwtPayload = { sub: user.id, email: user.email };
    const tokens = await this.signTokens(payload);
    const publicUser: PublicUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      departmentId: user.departmentId,
      departmentName: user.departmentName,
      createdAt: user.createdAt,
    };
    return { user: publicUser, tokens };
  }
}
