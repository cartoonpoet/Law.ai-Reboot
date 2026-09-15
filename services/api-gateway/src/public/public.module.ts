import { Module } from "@nestjs/common";
import { PublicStatsController } from "./public-stats.controller";

// 로그인 전 화면이 쓰는 인증 없는 경로 모음.
@Module({ controllers: [PublicStatsController] })
export class PublicModule {}
