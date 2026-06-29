import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import type { JwtPayload } from "@lawai/contracts";
import type { Request } from "express";

/**
 * JwtAuthGuard 통과 후 isSystemAdmin 확인.
 *
 * - 사전 조건: JwtAuthGuard 가 req.user 에 JwtPayload 를 주입했음.
 * - isSystemAdmin 은 access token 안에 포함(auth-service buildResult)되므로 추가 DB 호출 없이 가드.
 * - 토큰에 isSystemAdmin 이 없는(레거시 토큰) 사용자도 admin 아닌 것으로 본다 — 재로그인 필요.
 */
@Injectable()
export class AdminRoleGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request & { user?: JwtPayload }>();
    if (req.user?.isSystemAdmin !== true) {
      throw new ForbiddenException("관리자 권한이 필요합니다");
    }
    return true;
  }
}
