import {
  Controller,
  Get,
  Inject,
  NotFoundException,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { firstValueFrom } from "rxjs";
import {
  USER_PATTERNS,
  type JwtPayload,
  type PublicUser,
  type UserWithHash,
} from "@lawai/contracts";
import type { Request } from "express";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { rpcToHttp } from "../common/rpc-to-http";

@ApiTags("users")
@Controller("users")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(
    @Inject("USER_CLIENT") private readonly userClient: ClientProxy,
  ) {}

  @ApiOperation({ summary: "내 정보 조회", description: "JWT 토큰의 사용자 정보를 반환한다." })
  @Get("me")
  async me(@Req() req: Request): Promise<PublicUser> {
    const payload = (req as Request & { user: JwtPayload }).user;
    const user = await firstValueFrom(
      this.userClient
        .send<UserWithHash | null>(USER_PATTERNS.FIND_BY_ID, {
          id: payload.sub,
        })
        .pipe(rpcToHttp()),
    );
    if (!user) throw new NotFoundException("사용자를 찾을 수 없습니다");
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      isSystemAdmin: user.isSystemAdmin,
      departmentId: user.departmentId,
      departmentName: user.departmentName,
      createdAt: user.createdAt,
    };
  }

  @ApiOperation({ summary: "사용자 검색(디렉터리)", description: "관계자·참조·결재자 선택용" })
  @Get()
  search(
    @Query("q") q = "",
    @Query("limit") limit?: string,
  ): Promise<PublicUser[]> {
    return firstValueFrom(
      this.userClient
        .send<PublicUser[]>(USER_PATTERNS.SEARCH, {
          q,
          limit: limit ? Math.min(Number(limit), 100) : undefined,
        })
        .pipe(rpcToHttp()),
    );
  }
}
