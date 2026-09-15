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
  type TenantRole,
  type PasswordResetRequestRequest,
  type PasswordResetConfirmRequest,
  type PasswordResetResult,
  type ChangePasswordRequest,
  type ConsumeResetTokenResult,
  type FindMembershipsResponse,
  type SwitchTenantRequest,
  type MyTenantsRequest,
  type MyTenantsResponse,
} from "@lawai/contracts";
import type {
  AcceptInviteRequest,
  AcceptInviteResponse,
  AcceptInvitationRpcResult,
  AdminCreateTenantRequest,
  AdminCreateTenantResponse,
  CreateInvitationResult,
  FindInvitationResult,
  InviteInfoResponse,
  InviteMembersRequest,
  InviteMembersResponse,
  ResendInviteRequest,
  RotateInvitationResult,
  TenantDto,
} from "@lawai/contracts";
import { PasswordService } from "./password.service";
import { MailService } from "./mail.service";

const SUSPENDED_MESSAGE = "이용이 정지된 회사입니다. 관리자에게 문의하세요.";

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

  // 로그인한 사용자의 비밀번호 변경 — 현재 비밀번호가 맞아야 하고, 같은 비밀번호로는 바꾸지 않는다.
  // 새 비밀번호 형식(영문·숫자·특수문자 8자 이상)은 gateway DTO 가 검증한다.
  async changePassword(req: ChangePasswordRequest): Promise<PasswordResetResult> {
    const user = await firstValueFrom(
      this.userClient.send<UserWithHash | null>(USER_PATTERNS.FIND_BY_ID, { id: req.userId }),
    );
    if (!user) {
      throw new RpcException({ status: 404, message: "사용자를 찾을 수 없습니다" });
    }
    const isCurrentValid = await this.passwords.verify(user.passwordHash, req.currentPassword);
    if (!isCurrentValid) {
      throw new RpcException({ status: 400, message: "현재 비밀번호가 맞지 않습니다" });
    }
    if (req.currentPassword === req.newPassword) {
      throw new RpcException({ status: 400, message: "현재 비밀번호와 다른 비밀번호를 입력하세요" });
    }
    const passwordHash = await this.passwords.hash(req.newPassword);
    await firstValueFrom(
      this.userClient.send(USER_PATTERNS.UPDATE_PASSWORD, { userId: user.id, passwordHash }),
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
        isActive: m.tenantId === req.activeTenantId,
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

    let active: { tenantId: string; role: TenantRole } | undefined;

    if (activeTenantId) {
      const m = memberships.memberships.find((x) => x.tenantId === activeTenantId);
      if (!m) {
        throw new RpcException({ status: 403, message: "해당 회사 멤버가 아닙니다" });
      }
      if (m.tenantStatus === "suspended") {
        throw new RpcException({ status: 403, message: SUSPENDED_MESSAGE });
      }
      active = { tenantId: m.tenantId, role: m.role };
    } else {
      // 로그인: suspended 가 아닌 첫 멤버십을 활성으로. 전부 suspended 면 403 (Spec 3).
      const m = memberships.memberships.find((x) => x.tenantStatus !== "suspended");
      if (m) {
        active = { tenantId: m.tenantId, role: m.role };
      } else if (
        memberships.memberships.length > 0 &&
        !memberships.isSystemAdmin &&
        !allowEmpty
      ) {
        throw new RpcException({ status: 403, message: SUSPENDED_MESSAGE });
      }
    }

    if (!active && !memberships.isSystemAdmin && !allowEmpty) {
      throw new RpcException({ status: 403, message: "소속된 회사가 없습니다" });
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      isSystemAdmin: memberships.isSystemAdmin,
      activeTenantId: active?.tenantId,
      activeRole: active?.role,
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

  // ─── 온보딩 초대 (Spec 4) ──────────────────────────────────────────────

  private static readonly INVITER_ROLES: TenantRole[] = [
    "contractManager",
    "inHouseCounsel",
  ];

  private assertInvitePermission(req: {
    inviterRole?: TenantRole;
    isSystemAdmin?: boolean;
  }): void {
    if (req.isSystemAdmin) return;
    if (!req.inviterRole || !AuthService.INVITER_ROLES.includes(req.inviterRole)) {
      throw new RpcException({ status: 403, message: "멤버 초대 권한이 없습니다" });
    }
  }

  /** raw 토큰 생성 + user-service 저장 + 메일. created=false(스킵)면 메일 없음. */
  private async issueInvite(params: {
    tenantId: string;
    tenantName: string;
    email: string;
    role: TenantRole;
    invitedById: string;
  }): Promise<boolean> {
    const rawToken = randomBytes(32).toString("hex");
    const ttlDays = Number(process.env.INVITE_TTL_DAYS ?? 7);
    const expiresAt = new Date(Date.now() + ttlDays * 86_400_000).toISOString();
    const result = await firstValueFrom(
      this.userClient.send<CreateInvitationResult>(USER_PATTERNS.CREATE_INVITATION, {
        tenantId: params.tenantId,
        email: params.email,
        role: params.role,
        tokenHash: this.hashResetToken(rawToken),
        invitedById: params.invitedById,
        expiresAt,
      }),
    );
    if (!result.created) return false;
    const webUrl = process.env.APP_WEB_URL ?? "http://localhost:5173";
    this.mail.sendInviteLink(
      params.email,
      `${webUrl}/invite?token=${rawToken}`,
      params.tenantName,
    );
    return true;
  }

  /** admin 온보딩 1단계 — 회사 생성 + 첫 담당자(contractManager) 초대. */
  async adminCreateTenant(
    req: AdminCreateTenantRequest,
  ): Promise<AdminCreateTenantResponse> {
    if (!req.actorId) {
      throw new RpcException({ status: 400, message: "actorId가 필요합니다" });
    }
    const tenant = await firstValueFrom(
      this.userClient.send<TenantDto>(USER_PATTERNS.CREATE_TENANT, {
        name: req.name,
        plan: req.plan,
        status: req.status,
        trialEndsAt: req.trialEndsAt ?? null,
      }),
    );
    await this.issueInvite({
      tenantId: tenant.id,
      tenantName: tenant.name,
      email: req.managerEmail,
      role: "contractManager",
      invitedById: req.actorId,
    });
    return { tenant, invited: true };
  }

  /** 온보딩 2단계 — 담당자의 다건 초대. 스킵(중복) 이메일은 집계해 반환. */
  async inviteMembers(req: InviteMembersRequest): Promise<InviteMembersResponse> {
    this.assertInvitePermission(req);
    if (!req.tenantId || !req.invitedById) {
      throw new RpcException({ status: 400, message: "활성 회사가 없습니다" });
    }
    // 테넌트명은 멤버십에서 — 초대자는 항상 해당 테넌트 멤버(또는 admin).
    const memberships = await firstValueFrom(
      this.userClient.send<FindMembershipsResponse>(USER_PATTERNS.FIND_MEMBERSHIPS, {
        userId: req.invitedById,
      }),
    );
    const tenantName =
      memberships.memberships.find((m) => m.tenantId === req.tenantId)?.tenantName ??
      "고객사";

    let sent = 0;
    const skipped: string[] = [];
    for (const email of req.emails) {
      const created = await this.issueInvite({
        tenantId: req.tenantId,
        tenantName,
        email,
        role: req.role,
        invitedById: req.invitedById,
      });
      if (created) sent += 1;
      else skipped.push(email);
    }
    return { sent, skipped };
  }

  /** 초대 재발송 — 토큰 회전 후 재메일. */
  async resendInvite(req: ResendInviteRequest): Promise<{ ok: true }> {
    this.assertInvitePermission(req);
    if (!req.tenantId) {
      throw new RpcException({ status: 400, message: "활성 회사가 없습니다" });
    }
    const rawToken = randomBytes(32).toString("hex");
    const ttlDays = Number(process.env.INVITE_TTL_DAYS ?? 7);
    const rotated = await firstValueFrom(
      this.userClient.send<RotateInvitationResult>(USER_PATTERNS.ROTATE_INVITATION, {
        inviteId: req.inviteId,
        tenantId: req.tenantId,
        tokenHash: this.hashResetToken(rawToken),
        expiresAt: new Date(Date.now() + ttlDays * 86_400_000).toISOString(),
      }),
    );
    const webUrl = process.env.APP_WEB_URL ?? "http://localhost:5173";
    this.mail.sendInviteLink(
      rotated.email,
      `${webUrl}/invite?token=${rawToken}`,
      rotated.tenantName,
    );
    return { ok: true };
  }

  /** 온보딩 3단계 — 초대 정보 조회(수락 페이지). */
  async getInvite(req: { token: string }): Promise<InviteInfoResponse> {
    const invite = await firstValueFrom(
      this.userClient.send<FindInvitationResult | null>(USER_PATTERNS.FIND_INVITATION, {
        tokenHash: this.hashResetToken(req.token),
      }),
    );
    if (!invite) {
      throw new RpcException({
        status: 400,
        message: "유효하지 않거나 만료된 초대 링크입니다",
      });
    }
    return { tenantName: invite.tenantName, email: invite.email, role: invite.role };
  }

  /** 온보딩 3단계 — 수락. 신규는 자동 로그인 토큰까지, 기존은 멤버십 추가만. */
  async acceptInvite(req: AcceptInviteRequest): Promise<AcceptInviteResponse> {
    const passwordHash = await this.passwords.hash(req.password);
    const accepted = await firstValueFrom(
      this.userClient.send<AcceptInvitationRpcResult>(USER_PATTERNS.ACCEPT_INVITATION, {
        tokenHash: this.hashResetToken(req.token),
        name: req.name,
        passwordHash,
      }),
    );
    if (accepted.existingUser) {
      // 기존 계정: 멤버십만 추가됨 — 로그인 유도(다음 로그인부터 반영).
      return { existingUser: true };
    }
    const user = await firstValueFrom(
      this.userClient.send<UserWithHash | null>(USER_PATTERNS.FIND_BY_ID, {
        id: accepted.userId,
      }),
    );
    if (!user) {
      throw new RpcException({ status: 500, message: "가입 처리에 실패했습니다" });
    }
    const result = await this.buildResult(user, accepted.tenantId);
    return { existingUser: false, user: result.user, tokens: result.tokens };
  }

}
