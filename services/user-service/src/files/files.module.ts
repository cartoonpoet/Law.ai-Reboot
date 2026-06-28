import { Module } from "@nestjs/common";
import { FilesController } from "./files.controller";
import { FilesService } from "./files.service";
import { R2Client } from "./r2.client";
import { AuditService } from "../contracts/contracts.audit";

@Module({
  controllers: [FilesController],
  // AuditService 는 비교 보고서 다운로드 감사 기록에 사용 (FilesService 가 주입).
  providers: [FilesService, R2Client, AuditService],
  // R2Client 도 외부 모듈(contracts/comments)이 파일 GC 용도로 사용 → 함께 export.
  exports: [FilesService, R2Client],
})
export class FilesModule {}
