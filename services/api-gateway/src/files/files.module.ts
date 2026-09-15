import { Module } from "@nestjs/common";
import { FilesController } from "./files.controller";
import { FileContentController } from "./file-content.controller";

@Module({
  controllers: [FilesController, FileContentController],
})
export class FilesModule {}
