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

/**
 * SSE 전용 가드. EventSource 는 Authorization 헤더를 쓸 수 없으므로
 * `?token=` 쿼리 파라미터에서 토큰을 추출해 AUTH_PATTERNS.VALIDATE 로 검증한다.
 * 검증 코어(authClient.send VALIDATE → req.user 주입)는 JwtAuthGuard 와 동일.
 */
@Injectable()
export class SseJwtGuard implements CanActivate {
  constructor(
    @Inject("AUTH_CLIENT") private readonly authClient: ClientProxy,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const token = req.query.token;
    if (typeof token !== "string" || token.length === 0) {
      throw new UnauthorizedException("토큰 없음");
    }
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
