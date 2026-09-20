import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import {
  DOCUMENT_TEMPLATE_PATTERNS,
  type CreateTemplateRequest,
  type CreateTemplateVersionRequest,
  type GetTemplateRequest,
  type ListTemplatesRequest,
  type ListTemplateVersionsRequest,
  type RevertTemplateVersionRequest,
} from "@lawai/contracts";
import { DocumentTemplatesService } from "./document-templates.service";

@Controller()
export class DocumentTemplatesController {
  constructor(private readonly templates: DocumentTemplatesService) {}

  @MessagePattern(DOCUMENT_TEMPLATE_PATTERNS.CREATE)
  create(@Payload() req: CreateTemplateRequest) {
    return this.templates.create(req);
  }

  @MessagePattern(DOCUMENT_TEMPLATE_PATTERNS.LIST)
  list(@Payload() req: ListTemplatesRequest) {
    return this.templates.list(req);
  }

  @MessagePattern(DOCUMENT_TEMPLATE_PATTERNS.GET)
  get(@Payload() req: GetTemplateRequest) {
    return this.templates.get(req);
  }

  @MessagePattern(DOCUMENT_TEMPLATE_PATTERNS.CREATE_VERSION)
  createVersion(@Payload() req: CreateTemplateVersionRequest) {
    return this.templates.createVersion(req);
  }

  @MessagePattern(DOCUMENT_TEMPLATE_PATTERNS.LIST_VERSIONS)
  listVersions(@Payload() req: ListTemplateVersionsRequest) {
    return this.templates.listVersions(req);
  }

  @MessagePattern(DOCUMENT_TEMPLATE_PATTERNS.REVERT)
  revert(@Payload() req: RevertTemplateVersionRequest) {
    return this.templates.revert(req);
  }
}
