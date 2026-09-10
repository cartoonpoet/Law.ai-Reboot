import { Body, Controller, Get, HttpCode, Inject, Param, Post, Req, UseGuards } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { firstValueFrom } from "rxjs";
import type { Request } from "express";
import {
  AUTH_PATTERNS,
  type AcceptInviteRequest,
  type AcceptInviteResponse,
  type InviteInfoResponse,
  type JwtPayload,
  type MyTenantsRequest,
  type SwitchTenantRequest,
} from "@lawai/contracts";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { rpcToHttp } from "../common/rpc-to-http";
import {
  SignupDto,
  LoginDto,
  RefreshDto,
  PasswordResetRequestDto,
  PasswordResetConfirmDto,
} from "./dto";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    @Inject("AUTH_CLIENT") private readonly authClient: ClientProxy,
  ) {}

  @Post("signup")
  @ApiOperation({ summary: "회원가입", description: "계정을 생성하고 토큰을 발급한다." })
  signup(@Body() dto: SignupDto) {
    return firstValueFrom(
      this.authClient.send(AUTH_PATTERNS.SIGNUP, dto).pipe(rpcToHttp()),
    );
  }

  @Post("login")
  @ApiOperation({ summary: "로그인", description: "이메일/비밀번호로 로그인하고 토큰을 발급한다." })
  login(@Body() dto: LoginDto) {
    return firstValueFrom(
      this.authClient.send(AUTH_PATTERNS.LOGIN, dto).pipe(rpcToHttp()),
    );
  }

  @Post("refresh")
  @HttpCode(200)
  @ApiOperation({
    summary: "토큰 리프레시",
    description:
      "refresh token으로 새 access+refresh 토큰을 발급한다. access 만료 상태에서 호출되므로 가드 없이 공개한다.",
  })
  refresh(@Body() dto: RefreshDto) {
    return firstValueFrom(
      this.authClient.send(AUTH_PATTERNS.REFRESH, dto).pipe(rpcToHttp()),
    );
  }

  @Post("password/reset-request")
  @HttpCode(200)
  @ApiOperation({
    summary: "비밀번호 재설정 요청",
    description:
      "가입 이메일로 재설정 링크를 발송한다. 이메일 존재 여부를 노출하지 않기 위해 항상 { ok: true }를 반환한다.",
  })
  requestPasswordReset(@Body() dto: PasswordResetRequestDto) {
    return firstValueFrom(
      this.authClient
        .send(AUTH_PATTERNS.PASSWORD_RESET_REQUEST, dto)
        .pipe(rpcToHttp()),
    );
  }

  @Post("password/reset-confirm")
  @HttpCode(200)
  @ApiOperation({
    summary: "비밀번호 재설정 확정",
    description: "재설정 토큰과 새 비밀번호로 비밀번호를 변경한다.",
  })
  confirmPasswordReset(@Body() dto: PasswordResetConfirmDto) {
    return firstValueFrom(
      this.authClient
        .send(AUTH_PATTERNS.PASSWORD_RESET_CONFIRM, dto)
        .pipe(rpcToHttp()),
    );
  }

  @Post("switch-tenant")
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "활성 테넌트 전환",
    description: "로그인된 사용자가 소속된 다른 테넌트로 전환하고 새 토큰을 발급한다.",
  })
  switchTenant(@Body() dto: { tenantId: string }, @Req() req: Request) {
    const { sub } = (req as Request & { user: JwtPayload }).user;
    const payload: SwitchTenantRequest = { userId: sub, tenantId: dto.tenantId };
    return firstValueFrom(
      this.authClient.send(AUTH_PATTERNS.SWITCH_TENANT, payload).pipe(rpcToHttp()),
    );
  }

  @Get("me/tenants")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "내 소속 테넌트 목록",
    description: "JWT 사용자가 소속된 전체 테넌트 목록을 반환한다. isActive 로 현재 활성 테넌트를 표시.",
  })
  myTenants(@Req() req: Request) {
    const { sub, activeTenantId } = (req as Request & { user: JwtPayload }).user;
    const payload: MyTenantsRequest = { userId: sub, activeTenantId };
    return firstValueFrom(
      this.authClient.send(AUTH_PATTERNS.MY_TENANTS, payload).pipe(rpcToHttp()),
    );
  }

  @Get("invites/:token")
  @ApiOperation({
    summary: "초대 정보 조회 (공개)",
    description: "초대 링크 토큰으로 회사명/이메일/역할을 조회한다. 무효·만료 시 400.",
  })
  getInvite(@Param("token") token: string): Promise<InviteInfoResponse> {
    return firstValueFrom(
      this.authClient
        .send<InviteInfoResponse>(AUTH_PATTERNS.GET_INVITE, { token })
        .pipe(rpcToHttp()),
    );
  }

  @Post("invites/accept")
  @HttpCode(200)
  @ApiOperation({
    summary: "초대 수락 (공개)",
    description:
      "신규 이메일이면 가입+자동 로그인 토큰 발급, 기존 계정이면 멤버십만 추가(existingUser=true).",
  })
  acceptInvite(@Body() dto: AcceptInviteRequest): Promise<AcceptInviteResponse> {
    return firstValueFrom(
      this.authClient
        .send<AcceptInviteResponse>(AUTH_PATTERNS.ACCEPT_INVITE, dto)
        .pipe(rpcToHttp()),
    );
  }
}
