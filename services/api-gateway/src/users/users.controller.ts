import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Patch,
  Put,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { firstValueFrom } from "rxjs";
import {
  MAX_AVATAR_SIZE_BYTES,
  USER_PATTERNS,
  type AvatarUploadTarget,
  type AvatarUploadTargetRequest,
  type JwtPayload,
  type MyProfile,
  type PublicUser,
  type SearchUsersRequest,
  type UpdateProfileRequest,
  type UserProfileRow,
} from "@lawai/contracts";
import type { Request } from "express";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { readBodyOfSize } from "../common/read-body";
import { rpcToHttp } from "../common/rpc-to-http";
import { extractTenantContext } from "../common/tenant-context";
import { UpdateMyProfileDto } from "./dto";
import { toMyProfile } from "./to-my-profile";

const AVATAR_SIZE_MISMATCH_MESSAGE = "올린 사진 크기가 요청과 다릅니다";

@ApiTags("users")
@Controller("users")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(
    @Inject("USER_CLIENT") private readonly userClient: ClientProxy,
  ) {}

  private getUserId(req: Request): string {
    return (req as Request & { user: JwtPayload }).user.sub;
  }

  private sendProfile(pattern: string, payload: unknown): Promise<MyProfile> {
    return firstValueFrom(
      this.userClient.send<UserProfileRow>(pattern, payload).pipe(rpcToHttp()),
    ).then(toMyProfile);
  }

  @ApiOperation({ summary: "내 정보 조회", description: "JWT 토큰의 사용자 정보(이메일 알림·프로필 사진 포함)를 반환한다." })
  @Get("me")
  me(@Req() req: Request): Promise<MyProfile> {
    return this.sendProfile(USER_PATTERNS.GET_PROFILE, { userId: this.getUserId(req) });
  }

  @ApiOperation({ summary: "내 정보 수정", description: "이름·이메일 알림만 바꾼다. 이메일·부서·역할은 바꾸지 않는다." })
  @Patch("me")
  updateMe(@Body() dto: UpdateMyProfileDto, @Req() req: Request): Promise<MyProfile> {
    const payload: UpdateProfileRequest = { userId: this.getUserId(req), name: dto.name, emailNotify: dto.emailNotify, notifyApproval: dto.notifyApproval, notifyComment: dto.notifyComment };
    return this.sendProfile(USER_PATTERNS.UPDATE_PROFILE, payload);
  }

  @ApiOperation({
    summary: "프로필 사진 올리기",
    description: "본문에 이미지(PNG·JPG·WEBP, 2MB 이하)를 그대로 보낸다. 게이트웨이가 R2 에 올리고 내 사진으로 지정한다.",
  })
  @Put("me/avatar")
  async uploadAvatar(@Req() req: Request): Promise<MyProfile> {
    const userId = this.getUserId(req);
    const size = Number(req.headers["content-length"]);
    if (!(size > 0 && size <= MAX_AVATAR_SIZE_BYTES)) {
      throw new HttpException("프로필 사진은 2MB 이하만 올릴 수 있습니다", HttpStatus.BAD_REQUEST);
    }
    const mimeType = String(req.headers["content-type"] ?? "").split(";")[0].trim();
    const targetRequest: AvatarUploadTargetRequest = { userId, mimeType, size };
    const target = await firstValueFrom(
      this.userClient.send<AvatarUploadTarget>(USER_PATTERNS.AVATAR_UPLOAD_TARGET, targetRequest).pipe(rpcToHttp()),
    );
    const body = await readBodyOfSize(req, size, AVATAR_SIZE_MISMATCH_MESSAGE);

    let upstream: Response;
    try {
      upstream = await fetch(target.url, { method: "PUT", headers: { "Content-Type": mimeType }, body });
    } catch {
      throw new HttpException("파일 저장소에 연결할 수 없습니다", HttpStatus.BAD_GATEWAY);
    }
    await upstream.body?.cancel();
    if (!upstream.ok) {
      throw new HttpException("사진을 저장하지 못했습니다", HttpStatus.BAD_GATEWAY);
    }
    return this.sendProfile(USER_PATTERNS.AVATAR_CONFIRM, { userId, key: target.key });
  }

  @ApiOperation({ summary: "프로필 사진 지우기" })
  @Delete("me/avatar")
  removeAvatar(@Req() req: Request): Promise<MyProfile> {
    return this.sendProfile(USER_PATTERNS.AVATAR_REMOVE, { userId: this.getUserId(req) });
  }

  @ApiOperation({ summary: "사용자 검색(디렉터리)", description: "관계자·참조·결재자 선택용" })
  @Get()
  search(
    @Req() req: Request,
    @Query("q") q = "",
    @Query("limit") limit?: string,
  ): Promise<PublicUser[]> {
    const payload: SearchUsersRequest = {
      q,
      limit: limit ? Math.min(Number(limit), 100) : undefined,
      tenantContext: extractTenantContext(req),
    };
    return firstValueFrom(
      this.userClient
        .send<PublicUser[]>(USER_PATTERNS.SEARCH, payload)
        .pipe(rpcToHttp()),
    );
  }
}
