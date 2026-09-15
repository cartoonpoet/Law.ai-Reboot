import { Controller, Get, Header, Inject } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { firstValueFrom } from "rxjs";
import { CONTRACT_PATTERNS, type PublicStatsResponse } from "@lawai/contracts";
import { rpcToHttp } from "../common/rpc-to-http";

// 로그인 화면이 열릴 때마다 세지 않도록 1분 동안은 브라우저·중간 캐시가 같은 값을 쓴다.
const CACHE_SECONDS = 60;

/**
 * 공개 통계 — 로그인 전 화면(로그인 페이지 브랜드 패널)용이라 인증 가드가 없다.
 * 전체 합계 숫자만 돌려주고, 계약 내용·회사·테넌트 구분은 드러내지 않는다.
 */
@ApiTags("public")
@Controller("public")
export class PublicStatsController {
  constructor(
    @Inject("USER_CLIENT") private readonly userClient: ClientProxy,
  ) {}

  @ApiOperation({ summary: "공개 통계", description: "지금까지 법무 검토를 거친 계약 수(전체 합계). 인증 불필요." })
  @Get("stats")
  @Header("Cache-Control", `public, max-age=${CACHE_SECONDS}`)
  stats(): Promise<PublicStatsResponse> {
    return firstValueFrom(
      this.userClient.send<PublicStatsResponse>(CONTRACT_PATTERNS.PUBLIC_STATS, {}).pipe(rpcToHttp()),
    );
  }
}
