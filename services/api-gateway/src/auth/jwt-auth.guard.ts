import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { firstValueFrom } from "rxjs";
import { AUTH_PATTERNS, type JwtPayload } from "@lawai/contracts";
import type { Request } from "express";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject("AUTH_CLIENT") private readonly authClient: ClientProxy,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw new UnauthorizedException("토큰 없음");
    }
    const token = header.slice("Bearer ".length);
    try {
      const payload = await firstValueFrom(
        this.authClient.send<JwtPayload>(AUTH_PATTERNS.VALIDATE, { token }),
      );
      (req as Request & { user?: JwtPayload }).user = payload;
      return true;
    } catch {
      throw new UnauthorizedException("유효하지 않은 토큰");
    }
  }
}
