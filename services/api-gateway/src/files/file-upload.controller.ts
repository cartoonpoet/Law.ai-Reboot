import {
  Controller,
  HttpException,
  HttpStatus,
  Inject,
  Put,
  Query,
  Req,
  Res,
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { firstValueFrom } from "rxjs";
import type { Readable } from "node:stream";
import type { Request, Response as ExpressResponse } from "express";
import {
  FILE_PATTERNS,
  type GetUploadTargetRequest,
  type GetUploadTargetResponse,
} from "@lawai/contracts";
import { rpcToHttp } from "../common/rpc-to-http";

const SIZE_MISMATCH_MESSAGE = "올린 파일 크기가 신청한 크기와 다릅니다";

/**
 * 파일 업로드 중계 — PUT /files/upload?token=
 *
 * 브라우저가 R2(cloudflarestorage.com)에 직접 올리지 못하는 환경(회사망 차단 등)에서도 올라가도록
 * 게이트웨이가 본문을 받아 R2 로 올린다. 흐름(presign → 업로드 → confirm)과 응답 ETag 는 그대로다.
 * 토큰은 presign(권한·파일 검증) 때 발급한 업로드 토큰이다.
 */
@ApiTags("files")
@Controller("files")
export class FileUploadController {
  constructor(
    @Inject("USER_CLIENT") private readonly userClient: ClientProxy,
  ) {}

  @ApiOperation({
    summary: "파일 업로드 중계",
    description: "업로드 토큰을 확인하고, 신청한 크기와 같은 본문만 받아 R2 로 올린 뒤 ETag 를 돌려준다.",
  })
  @Put("upload")
  async upload(
    @Query("token") token: string | undefined,
    @Req() req: Request,
    @Res({ passthrough: true }) res: ExpressResponse,
  ): Promise<{ etag: string }> {
    if (!token) {
      throw new HttpException("토큰 없음", HttpStatus.UNAUTHORIZED);
    }
    const payload: GetUploadTargetRequest = { token };
    const target = await firstValueFrom(
      this.userClient
        .send<GetUploadTargetResponse>(FILE_PATTERNS.GET_UPLOAD_TARGET, payload)
        .pipe(rpcToHttp()),
    );
    // 본문을 읽기 전에 신청 크기와 비교해 큰 파일을 헛되이 받지 않는다.
    if (Number(req.headers["content-length"]) !== target.size) {
      throw new HttpException(SIZE_MISMATCH_MESSAGE, HttpStatus.BAD_REQUEST);
    }
    const body = await readBodyOfSize(req, target.size);

    let upstream: Response;
    try {
      // R2 는 길이를 모르는 스트림 업로드를 받지 않으므로 본문을 모아 길이와 함께 보낸다(최대 50MB).
      upstream = await fetch(target.url, {
        method: "PUT",
        headers: { "Content-Type": target.mimeType },
        body,
      });
    } catch {
      throw new HttpException("파일 저장소에 연결할 수 없습니다", HttpStatus.BAD_GATEWAY);
    }
    await upstream.body?.cancel();
    if (!upstream.ok) {
      throw new HttpException("파일 저장소에 올리지 못했습니다", HttpStatus.BAD_GATEWAY);
    }

    const etag = (upstream.headers.get("etag") ?? "").replace(/^"|"$/g, "");
    // 웹은 R2 직접 업로드 때처럼 ETag 헤더를 읽는다. 로컬 개발(다른 포트)에서도 읽히게 노출한다.
    res.setHeader("ETag", `"${etag}"`);
    res.setHeader("Access-Control-Expose-Headers", "ETag");
    return { etag };
  }
}

// 신청한 크기만큼만 받는다 — 넘치면 바로 멈춰 메모리를 지키고, 모자라도 거절한다.
const readBodyOfSize = async (stream: Readable, size: number): Promise<Buffer> => {
  const chunks: Buffer[] = [];
  let received = 0;
  for await (const chunk of stream) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array);
    received += buffer.length;
    if (received > size) {
      throw new HttpException(SIZE_MISMATCH_MESSAGE, HttpStatus.BAD_REQUEST);
    }
    chunks.push(buffer);
  }
  if (received !== size) {
    throw new HttpException(SIZE_MISMATCH_MESSAGE, HttpStatus.BAD_REQUEST);
  }
  return Buffer.concat(chunks, size);
};
