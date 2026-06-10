import { Body, Controller, HttpCode, Inject, Post } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { firstValueFrom } from "rxjs";
import { AUTH_PATTERNS } from "@lawai/contracts";
import { rpcToHttp } from "../common/rpc-to-http";
import {
  SignupDto,
  LoginDto,
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
}
