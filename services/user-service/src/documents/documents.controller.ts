import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { DOCUMENT_PATTERNS, type ExportDocumentRequest, type ImportDocumentRequest } from "@lawai/contracts";
import { DocumentsService } from "./documents.service";

@Controller()
export class DocumentsController {
  constructor(protected readonly documents: DocumentsService) {}

  @MessagePattern(DOCUMENT_PATTERNS.EXPORT)
  export(@Payload() req: ExportDocumentRequest) {
    return this.documents.export(req);
  }

  @MessagePattern(DOCUMENT_PATTERNS.IMPORT)
  import(@Payload() req: ImportDocumentRequest) {
    return this.documents.import(req);
  }
}
