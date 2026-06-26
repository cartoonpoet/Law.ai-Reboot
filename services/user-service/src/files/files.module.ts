import { Module } from "@nestjs/common";
import { FilesController } from "./files.controller";
import { FilesService } from "./files.service";
import { R2Client } from "./r2.client";

@Module({
  controllers: [FilesController],
  providers: [FilesService, R2Client],
  exports: [FilesService],
})
export class FilesModule {}
