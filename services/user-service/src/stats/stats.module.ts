import { Module } from "@nestjs/common";
import { StatsController } from "./stats.controller";
import { StatsService } from "./stats.service";

/** 업무 통계 — 단계별 소요시간. 기록은 StatusEventsModule 이 남기고, 여기서는 읽기만 한다. */
@Module({
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}
