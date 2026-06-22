import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { COMMENT_PATTERNS } from "@lawai/contracts";
import type {
  CreateCommentRequest,
  ListCommentsRequest,
} from "@lawai/contracts";
import { CommentsService } from "./comments.service";

@Controller()
export class CommentsController {
  constructor(private readonly comments: CommentsService) {}

  @MessagePattern(COMMENT_PATTERNS.CREATE)
  create(@Payload() req: CreateCommentRequest) {
    return this.comments.create(req);
  }

  @MessagePattern(COMMENT_PATTERNS.LIST)
  list(@Payload() req: ListCommentsRequest) {
    return this.comments.list(req);
  }
}
