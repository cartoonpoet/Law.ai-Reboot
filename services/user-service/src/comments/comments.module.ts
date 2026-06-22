import { Module } from "@nestjs/common";
import { CommentsController } from "./comments.controller";
import { CommentsService } from "./comments.service";
import { AuditService } from "../contracts/contracts.audit";

@Module({
  controllers: [CommentsController],
  // contracts.authz 는 순수 함수 모듈이라 provider 불필요(import 만).
  // AuditService 는 코멘트 생성 감사 기록에 재사용(생성자 주입).
  providers: [CommentsService, AuditService],
})
export class CommentsModule {}
