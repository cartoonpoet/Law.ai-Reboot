import { Body, Controller, Inject, Post } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { firstValueFrom } from "rxjs";
import { AUTH_PATTERNS } from "@lawai/contracts";
import { rpcToHttp } from "../common/rpc-to-http";
import { SignupDto, LoginDto } from "./dto";

@Controller("auth")
export class AuthController {
  constructor(
    @Inject("AUTH_CLIENT") private readonly authClient: ClientProxy,
  ) {}

  @Post("signup")
  signup(@Body() dto: SignupDto) {
    return firstValueFrom(
      this.authClient.send(AUTH_PATTERNS.SIGNUP, dto).pipe(rpcToHttp()),
    );
  }

  @Post("login")
  login(@Body() dto: LoginDto) {
    return firstValueFrom(
      this.authClient.send(AUTH_PATTERNS.LOGIN, dto).pipe(rpcToHttp()),
    );
  }
}
