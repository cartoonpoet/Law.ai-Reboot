import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { firstValueFrom } from "rxjs";
import type { Request, Response } from "express";
import {
  FILE_PATTERNS,
  type ConfirmUploadRequest,
  type FileAttachmentDto,
  type GetDownloadUrlResponse,
  type JwtPayload,
  type PresignUploadRequest,
  type PresignUploadResponse,
} from "@lawai/contracts";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { rpcToHttp } from "../common/rpc-to-http";
import { ConfirmDto, PresignDto } from "./dto";

/**
 * 파일 업로드/다운로드 게이트웨이.
 *
 * - presign: 클라이언트가 SubtleCrypto 로 sha256 계산 후 호출 → R2 PUT URL + uploadToken 발급.
 * - confirm: 클라이언트가 R2 PUT 후 ETag 와 함께 호출 → user-service 가 HeadObject 검증 + File row.
 * - download: 권한 검증 후 단기 presigned GET URL 로 302 리다이렉트.
 */
@ApiTags("files")
@Controller("files")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FilesController {
  constructor(
    @Inject("USER_CLIENT") private readonly userClient: ClientProxy,
  ) {}

  @ApiOperation({ summary: "R2 업로드 URL 발급(presigned PUT)" })
  @Post("presign")
  presign(
    @Body() dto: PresignDto,
    @Req() req: Request,
  ): Promise<PresignUploadResponse> {
    const { sub } = (req as Request & { user: JwtPayload }).user;
    const payload: PresignUploadRequest = { ...dto, viewerId: sub };
    return firstValueFrom(
      this.userClient
        .send<PresignUploadResponse>(FILE_PATTERNS.PRESIGN, payload)
        .pipe(rpcToHttp()),
    );
  }

  @ApiOperation({ summary: "업로드 확정(HeadObject 검증 + File row 생성)" })
  @Post("confirm")
  confirm(
    @Body() dto: ConfirmDto,
    @Req() req: Request,
  ): Promise<FileAttachmentDto> {
    const { sub } = (req as Request & { user: JwtPayload }).user;
    const payload: ConfirmUploadRequest = { ...dto, viewerId: sub };
    return firstValueFrom(
      this.userClient
        .send<FileAttachmentDto>(FILE_PATTERNS.CONFIRM, payload)
        .pipe(rpcToHttp()),
    );
  }

  @ApiOperation({
    summary: "파일 다운로드(302 redirect)",
    description: "권한 검증 후 단기 presigned GET URL 로 리다이렉트",
  })
  @Get(":id/download")
  async download(
    @Param("id") id: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const { sub } = (req as Request & { user: JwtPayload }).user;
    const result = await firstValueFrom(
      this.userClient
        .send<GetDownloadUrlResponse>(FILE_PATTERNS.GET_DOWNLOAD_URL, {
          fileId: id,
          viewerId: sub,
        })
        .pipe(rpcToHttp()),
    );
    res.redirect(302, result.url);
  }
}
