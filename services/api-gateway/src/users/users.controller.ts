import {
  Controller,
  Get,
  Inject,
  NotFoundException,
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
export class UsersController {
  constructor(
    @Inject("USER_CLIENT") private readonly userClient: ClientProxy,
  ) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
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
      createdAt: user.createdAt,
    };
  }
}
