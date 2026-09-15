import { Controller, Get, HttpException, HttpStatus, Inject, Param, Res } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { firstValueFrom } from "rxjs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as NodeWebReadableStream } from "node:stream/web";
import type { Response as ExpressResponse } from "express";
import { USER_PATTERNS, type AvatarSource, type AvatarSourceRequest } from "@lawai/contracts";
import { rpcToHttp } from "../common/rpc-to-http";

/**
 * 프로필 사진 보여주기 — GET /users/:userId/avatar/:fileName
 *
 * <img> 는 로그인 헤더를 붙일 수 없어 가드 없이 연다. 대신 파일 이름이 올릴 때마다 새로 만든 무작위 값이고,
 * user-service 가 "그 사용자의 현재 사진"일 때만 받아올 주소를 준다(지난 사진·다른 파일은 404).
 * 파일 이름이 바뀌지 않는 한 내용도 같으므로 브라우저 캐시를 길게 둔다.
 */
@ApiTags("users")
@Controller("users")
export class AvatarController {
  constructor(
    @Inject("USER_CLIENT") private readonly userClient: ClientProxy,
  ) {}

  @ApiOperation({ summary: "프로필 사진 보기" })
  @Get(":userId/avatar/:fileName")
  async avatar(
    @Param("userId") userId: string,
    @Param("fileName") fileName: string,
    @Res() res: ExpressResponse,
  ): Promise<void> {
    const payload: AvatarSourceRequest = { userId, fileName };
    const source = await firstValueFrom(
      this.userClient.send<AvatarSource>(USER_PATTERNS.AVATAR_SOURCE, payload).pipe(rpcToHttp()),
    );

    let upstream: Response;
    try {
      upstream = await fetch(source.url);
    } catch {
      throw new HttpException("파일 저장소에 연결할 수 없습니다", HttpStatus.BAD_GATEWAY);
    }
    if (!upstream.ok || !upstream.body) {
      await upstream.body?.cancel();
      throw new HttpException("사진을 불러오지 못했습니다", HttpStatus.BAD_GATEWAY);
    }

    res.status(200);
    const contentType = upstream.headers.get("content-type");
    const contentLength = upstream.headers.get("content-length");
    if (contentType) res.setHeader("Content-Type", contentType);
    if (contentLength && !upstream.headers.has("content-encoding")) res.setHeader("Content-Length", contentLength);
    res.setHeader("Cache-Control", "private, max-age=86400, immutable");
    // helmet 기본값(same-origin)이면 로컬 개발(웹 :5173 → 게이트웨이 :3000)에서 <img> 가 막힌다.
    res.setHeader("Cross-Origin-Resource-Policy", "same-site");

    await pipeline(Readable.fromWeb(upstream.body as NodeWebReadableStream<Uint8Array>), res).catch(() => undefined);
  }
}
