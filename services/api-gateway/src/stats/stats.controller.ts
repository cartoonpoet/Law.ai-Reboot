import { Controller, Get, Inject, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { ClientProxy } from "@nestjs/microservices";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { firstValueFrom } from "rxjs";
import {
  STATS_PATTERNS,
  type CycleTimeStatsResponse,
  type CycleTimeTargetTypes,
  type JwtPayload,
} from "@lawai/contracts";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { extractTenantContext } from "../common/tenant-context";
import { rpcToHttp } from "../common/rpc-to-http";
import { CycleTimeQueryDto } from "./dto";

const getViewerId = (req: Request): string => (req as Request & { user: JwtPayload }).user.sub;

/** 업무 통계 — 단계별 소요시간. */
@ApiTags("stats")
@Controller("stats")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class StatsController {
  constructor(@Inject("USER_CLIENT") private readonly userClient: ClientProxy) {}

  @ApiOperation({ summary: "단계별 소요시간 통계" })
  @Get("cycle-time")
  async cycleTime(@Req() req: Request, @Query() query: CycleTimeQueryDto): Promise<CycleTimeStatsResponse> {
    return firstValueFrom(
      this.userClient
        .send<CycleTimeStatsResponse>(STATS_PATTERNS.CYCLE_TIME, {
          tenantContext: extractTenantContext(req),
          viewerId: getViewerId(req),
          // 기본 탭과 같은 계약으로 시작한다. 잘못된 값은 DTO 에서 이미 400 으로 걸린다.
          targetType: (query.targetType ?? "contract") satisfies CycleTimeTargetTypes,
          from: query.from,
          to: query.to,
          ownerId: query.ownerId,
        })
        .pipe(rpcToHttp()),
    );
  }
}
