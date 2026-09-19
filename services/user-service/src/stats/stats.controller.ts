import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { STATS_PATTERNS, type CycleTimeStatsRequest } from "@lawai/contracts";
import { StatsService } from "./stats.service";

@Controller()
export class StatsController {
  constructor(private readonly stats: StatsService) {}

  @MessagePattern(STATS_PATTERNS.CYCLE_TIME)
  cycleTime(@Payload() req: CycleTimeStatsRequest) {
    return this.stats.cycleTime(req);
  }
}
