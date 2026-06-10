import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import {
  AUTH_PATTERNS,
  type SignupRequest,
  type LoginRequest,
  type ValidateTokenRequest,
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
}
