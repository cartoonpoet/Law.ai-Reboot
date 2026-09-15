import { Module } from "@nestjs/common";
import { FilesController } from "./files.controller";
import { FileContentController } from "./file-content.controller";
import { FileUploadController } from "./file-upload.controller";

@Module({
  controllers: [FilesController, FileContentController, FileUploadController],
})
export class FilesModule {}
