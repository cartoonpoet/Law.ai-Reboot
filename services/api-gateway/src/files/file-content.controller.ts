import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Param,
  Query,
  Req,
  Res,
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { firstValueFrom } from "rxjs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as NodeWebReadableStream } from "node:stream/web";
import type { Request, Response as ExpressResponse } from "express";
import {
  FILE_PATTERNS,
  type GetFileContentSourceRequest,
  type GetFileContentSourceResponse,
} from "@lawai/contracts";
import { rpcToHttp } from "../common/rpc-to-http";

// R2 응답에서 브라우저로 그대로 넘길 헤더. 부분 요청(Range) 관련 헤더를 넘겨야 PDF 뷰어가 나눠 받는다.
const PASS_THROUGH_HEADERS = [
  "content-type",
  "content-length",
  "content-range",
  "accept-ranges",
  "content-disposition",
  "etag",
  "last-modified",
] as const;

/**
 * 파일 내용 중계 — /files/:id/content?token=
 *
 * 브라우저가 R2(cloudflarestorage.com)에 직접 닿지 못하는 환경(회사망 차단 등)에서도 파일이 열리도록
 * 게이트웨이가 R2 에서 받아 그대로 흘려준다.
 * 이미지·PDF 뷰어·새 탭은 로그인 헤더를 붙일 수 없으므로 JwtAuthGuard 대신
 * 다운로드 주소 발급(/files/:id/download, 권한 확인) 때 받은 파일 전용 토큰으로 확인한다.
 */
@ApiTags("files")
@Controller("files")
export class FileContentController {
  constructor(
    @Inject("USER_CLIENT") private readonly userClient: ClientProxy,
  ) {}

  @ApiOperation({
    summary: "파일 내용 중계",
    description: "다운로드 주소의 토큰을 확인한 뒤 R2 에서 받은 파일을 그대로 내려준다. Range 요청 지원.",
  })
  @Get(":id/content")
  async content(
    @Param("id") id: string,
    @Query("token") token: string | undefined,
    @Req() req: Request,
    @Res() res: ExpressResponse,
  ): Promise<void> {
    if (!token) {
      throw new HttpException("토큰 없음", HttpStatus.UNAUTHORIZED);
    }
    const payload: GetFileContentSourceRequest = { fileId: id, token };
    const source = await firstValueFrom(
      this.userClient
        .send<GetFileContentSourceResponse>(FILE_PATTERNS.GET_CONTENT_SOURCE, payload)
        .pipe(rpcToHttp()),
    );

    const range = req.headers.range;
    let upstream: Response;
    try {
      upstream = await fetch(source.url, { headers: range ? { Range: range } : {} });
    } catch {
      throw new HttpException("파일 저장소에 연결할 수 없습니다", HttpStatus.BAD_GATEWAY);
    }
    if (!upstream.ok || !upstream.body) {
      await upstream.body?.cancel();
      throw toUpstreamError(upstream.status);
    }

    res.status(upstream.status);
    for (const name of PASS_THROUGH_HEADERS) {
      const value = upstream.headers.get(name);
      // fetch 가 압축을 풀었으면 원래 길이가 맞지 않으므로 넘기지 않는다.
      if (value && !(name === "content-length" && upstream.headers.has("content-encoding"))) {
        res.setHeader(name, value);
      }
    }
    // 토큰 주소는 사용자별·단기라 공유 캐시에 남기지 않는다.
    res.setHeader("Cache-Control", "private, no-store");
    // helmet 기본값(same-origin)이면 로컬 개발(웹 :5173 → 게이트웨이 :3000)에서 <img> 가 막힌다.
    res.setHeader("Cross-Origin-Resource-Policy", "same-site");

    // 브라우저가 중간에 끊으면(PDF 뷰어가 부분 요청으로 전환 등) 파이프 오류가 나지만 정상 흐름이다.
    await pipeline(
      Readable.fromWeb(upstream.body as NodeWebReadableStream<Uint8Array>),
      res,
    ).catch(() => undefined);
  }
}

const toUpstreamError = (status: number): HttpException => {
  if (status === HttpStatus.NOT_FOUND) {
    return new HttpException("파일을 찾을 수 없습니다", HttpStatus.NOT_FOUND);
  }
  if (status === HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE) {
    return new HttpException("요청한 범위가 파일 크기를 벗어났습니다", status);
  }
  return new HttpException("파일을 불러오지 못했습니다", HttpStatus.BAD_GATEWAY);
};
