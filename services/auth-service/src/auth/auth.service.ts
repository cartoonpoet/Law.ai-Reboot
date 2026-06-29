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
  type FindMembershipsResponse,
  type SwitchTenantRequest,
  type MyTenantsRequest,
  type MyTenantsResponse,
} from "@lawai/contracts";
import { PasswordService } from "./password.service";
import { MailService } from "./mail.service";

interface AuthResult {
  user: PublicUser;
  tokens: AuthTokens;
}

interface BuildResultOptions {
  /** true이면 멤버십 0개 + 비admin 이어도 403을 던지지 않는다 (signup 신규 가입자용). */
  allowEmpty?: boolean;
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
    // 신규 가입자는 아직 어느 테넌트에도 속하지 않으므로 allowEmpty=true.
    // 온보딩 플로우(Spec 4)에서 테넌트 합류 후 switchTenant 호출.
    return this.buildResult(created, undefined, { allowEmpty: true });
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
    // login은 멤버십 0개 + 비admin → 403 (allowEmpty=false, 기본값)
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
    return this.signTokens({
      sub: payload.sub,
      email: payload.email,
      isSystemAdmin: payload.isSystemAdmin,
      activeTenantId: payload.activeTenantId,
      activeRole: payload.activeRole,
    });
  }

  /**
   * 요청한 tenantId로 활성 테넌트를 전환하고 새 토큰을 발급한다.
   * userId 가 해당 테넌트 멤버가 아니면 403 을 던진다.
   */
  async switchTenant(req: SwitchTenantRequest): Promise<AuthResult> {
    if (!req.userId) {
      throw new RpcException({ status: 400, message: "userId가 필요합니다" });
    }
    const user = await firstValueFrom(
      this.userClient.send<UserWithHash | null>(USER_PATTERNS.FIND_BY_ID, { id: req.userId }),
    );
    if (!user) {
      throw new RpcException({ status: 404, message: "사용자를 찾을 수 없습니다" });
    }
    // 멤버 검증은 buildResult 내부에서 수행 (명시적 activeTenantId가 멤버십에 없으면 403)
    return this.buildResult(user, req.tenantId);
  }

  /**
   * 사용자가 속한 테넌트(회사) 목록을 반환한다.
   */
  async myTenants(req: MyTenantsRequest): Promise<MyTenantsResponse> {
    if (!req.userId) {
      throw new RpcException({ status: 400, message: "userId가 필요합니다" });
    }
    const memberships = await firstValueFrom(
      this.userClient.send<FindMembershipsResponse>(USER_PATTERNS.FIND_MEMBERSHIPS, {
        userId: req.userId,
      }),
    );
    return {
      tenants: memberships.memberships.map((m) => ({
        tenantId: m.tenantId,
        name: m.tenantName,
        role: m.role,
        isActive: false,
      })),
    };
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

  /**
   * 멤버십을 조회해 활성 테넌트를 결정하고 JWT 페이로드 + publicUser 를 조합한다.
   *
   * 활성 테넌트 결정 규칙:
   *   1. activeTenantId 명시 → 멤버십에 없으면 403
   *   2. 첫 번째 멤버십 자동 선택
   *   3. 멤버십 없음 + isSystemAdmin → activeTenantId/activeRole 없이 토큰 발급
   *   4. 멤버십 없음 + 비admin + allowEmpty=false → 403
   *   5. 멤버십 없음 + 비admin + allowEmpty=true → 토큰 발급(온보딩 임시 허용)
   */
  private async buildResult(
    user: UserWithHash,
    activeTenantId?: string,
    opts: BuildResultOptions = {},
  ): Promise<AuthResult> {
    const { allowEmpty = false } = opts;

    const memberships = await firstValueFrom(
      this.userClient.send<FindMembershipsResponse>(
        USER_PATTERNS.FIND_MEMBERSHIPS,
        { userId: user.id },
      ),
    );

    let active: { tenantId: string; role: string } | undefined;

    if (activeTenantId) {
      const m = memberships.memberships.find((x) => x.tenantId === activeTenantId);
      if (!m) {
        throw new RpcException({ status: 403, message: "해당 회사 멤버가 아닙니다" });
      }
      active = { tenantId: m.tenantId, role: m.role };
    } else if (memberships.memberships.length > 0) {
      const m = memberships.memberships[0];
      active = { tenantId: m.tenantId, role: m.role };
    }

    if (!active && !memberships.isSystemAdmin && !allowEmpty) {
      throw new RpcException({ status: 403, message: "소속된 회사가 없습니다" });
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      isSystemAdmin: memberships.isSystemAdmin,
      activeTenantId: active?.tenantId,
      activeRole: active?.role as JwtPayload["activeRole"],
    };

    const tokens = await this.signTokens(payload);

    const publicUser: PublicUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      isSystemAdmin: memberships.isSystemAdmin,
      departmentId: user.departmentId,
      departmentName: user.departmentName,
      createdAt: user.createdAt,
    };

    return { user: publicUser, tokens };
  }
}
