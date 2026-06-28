import { Module } from "@nestjs/common";
import { FilesController } from "./files.controller";
import { FilesService } from "./files.service";
import { R2Client } from "./r2.client";

@Module({
  controllers: [FilesController],
  providers: [FilesService, R2Client],
  // R2Client 도 외부 모듈(contracts/comments)이 파일 GC 용도로 사용 → 함께 export.
  exports: [FilesService, R2Client],
})
export class FilesModule {}
