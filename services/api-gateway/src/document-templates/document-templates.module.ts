import { Module } from "@nestjs/common";
import { DocumentTemplatesController } from "./document-templates.controller";

@Module({ controllers: [DocumentTemplatesController] })
export class DocumentTemplatesModule {}
