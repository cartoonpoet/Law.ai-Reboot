import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import {
  AUTH_PATTERNS,
  type SignupRequest,
  type LoginRequest,
  type ValidateTokenRequest,
  type RefreshRequest,
  type PasswordResetRequestRequest,
  type PasswordResetConfirmRequest,
  type ChangePasswordRequest,
  type SwitchTenantRequest,
  type MyTenantsRequest,
} from "@lawai/contracts";
import type {
  AcceptInviteRequest,
  AdminCreateTenantRequest,
  InviteMembersRequest,
  ResendInviteRequest,
} from "@lawai/contracts";
import { AuthService } from "./auth.service";

@Controller()
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @MessagePattern(AUTH_PATTERNS.SIGNUP)
  signup(@Payload() req: SignupRequest) {
    return this.auth.signup(req);
  }

  @MessagePattern(AUTH_PATTERNS.LOGIN)
  login(@Payload() req: LoginRequest) {
    return this.auth.login(req);
  }

  @MessagePattern(AUTH_PATTERNS.VALIDATE)
  validate(@Payload() req: ValidateTokenRequest) {
    return this.auth.validate(req);
  }

  @MessagePattern(AUTH_PATTERNS.REFRESH)
  refresh(@Payload() req: RefreshRequest) {
    return this.auth.refresh(req);
  }

  @MessagePattern(AUTH_PATTERNS.PASSWORD_RESET_REQUEST)
  requestPasswordReset(@Payload() req: PasswordResetRequestRequest) {
    return this.auth.requestPasswordReset(req);
  }

  @MessagePattern(AUTH_PATTERNS.PASSWORD_RESET_CONFIRM)
  confirmPasswordReset(@Payload() req: PasswordResetConfirmRequest) {
    return this.auth.confirmPasswordReset(req);
  }

  @MessagePattern(AUTH_PATTERNS.PASSWORD_CHANGE)
  changePassword(@Payload() req: ChangePasswordRequest) {
    return this.auth.changePassword(req);
  }

  @MessagePattern(AUTH_PATTERNS.SWITCH_TENANT)
  switchTenant(@Payload() req: SwitchTenantRequest) {
    return this.auth.switchTenant(req);
  }

  @MessagePattern(AUTH_PATTERNS.MY_TENANTS)
  myTenants(@Payload() req: MyTenantsRequest) {
    return this.auth.myTenants(req);
  }

  @MessagePattern(AUTH_PATTERNS.ADMIN_CREATE_TENANT)
  adminCreateTenant(@Payload() req: AdminCreateTenantRequest) {
    return this.auth.adminCreateTenant(req);
  }

  @MessagePattern(AUTH_PATTERNS.INVITE_MEMBERS)
  inviteMembers(@Payload() req: InviteMembersRequest) {
    return this.auth.inviteMembers(req);
  }

  @MessagePattern(AUTH_PATTERNS.RESEND_INVITE)
  resendInvite(@Payload() req: ResendInviteRequest) {
    return this.auth.resendInvite(req);
  }

  @MessagePattern(AUTH_PATTERNS.GET_INVITE)
  getInvite(@Payload() req: { token: string }) {
    return this.auth.getInvite(req);
  }

  @MessagePattern(AUTH_PATTERNS.ACCEPT_INVITE)
  acceptInvite(@Payload() req: AcceptInviteRequest) {
    return this.auth.acceptInvite(req);
  }
}
