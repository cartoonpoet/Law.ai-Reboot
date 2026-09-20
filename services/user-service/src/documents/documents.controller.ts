import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import {
  DOCUMENT_PATTERNS,
  type AiDraftRequest,
  type AiRewriteRequest,
  type AiReviewRequest,
  type ExportDocumentRequest,
  type ImportDocumentRequest,
} from "@lawai/contracts";
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

  @MessagePattern(DOCUMENT_PATTERNS.AI_DRAFT)
  aiDraft(@Payload() req: AiDraftRequest) {
    return this.documents.aiDraft(req);
  }

  @MessagePattern(DOCUMENT_PATTERNS.AI_REWRITE)
  aiRewrite(@Payload() req: AiRewriteRequest) {
    return this.documents.aiRewrite(req);
  }

  @MessagePattern(DOCUMENT_PATTERNS.AI_REVIEW)
  aiReview(@Payload() req: AiReviewRequest) {
    return this.documents.aiReview(req);
  }
}
