import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { firstValueFrom, map } from "rxjs";
import type { Request } from "express";
import {
  COMMENT_PATTERNS,
  CONTRACT_PATTERNS,
  type CommentDto,
  type CompleteSigningRequest,
  type CompleteSigningResult,
  type FinalizeRegistrationRequest,
  type FinalizeRegistrationResult,
  type ContractResponse,
  type ContractStatus,
  type CreateCommentRequest,
  type CreateCommentResult,
  type CreateContractRequest,
  type DeleteCommentRequest,
  type JwtPayload,
  type ListCommentsRequest,
  type ListContractsRequest,
  type ListContractsResponse,
  type ReplaceSignedFileRequest,
  type ReplaceSignedFileResult,
  type SubmitContractApprovalRequest,
  type SubmitContractApprovalResult,
  type UpdateCommentRequest,
  type UpdateContractRequest,
  type UpdateContractStatusRequest,
} from "@lawai/contracts";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { rpcToHttp } from "../common/rpc-to-http";
import { extractTenantContext } from "../common/tenant-context";
import { NotificationHubService } from "../notifications/notification-hub.service";
import {
  CompleteSigningDto,
  CreateCommentDto,
  CreateContractDto,
  FinalizeRegistrationDto,
  ReplaceSignedFileDto,
  UpdateCommentDto,
  UpdateContractDto,
  UpdateContractStatusDto,
} from "./dto";

@ApiTags("contracts")
@Controller("contracts")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ContractsController {
  constructor(
    @Inject("USER_CLIENT") private readonly userClient: ClientProxy,
    private readonly hub: NotificationHubService,
  ) {}

  @ApiOperation({ summary: "계약검토 요청 생성" })
  @Post()
  create(
    @Body() dto: CreateContractDto,
    @Req() req: Request,
  ): Promise<ContractResponse> {
    const { sub } = (req as Request & { user: JwtPayload }).user;
    const payload: CreateContractRequest = {
      ...dto,
      createdById: sub,
      tenantContext: extractTenantContext(req),
    };
    return firstValueFrom(
      this.userClient
        .send<ContractResponse>(CONTRACT_PATTERNS.CREATE, payload)
        .pipe(rpcToHttp()),
    );
  }

  @ApiOperation({ summary: "계약 목록 조회", description: "필터(q·status/statuses·expiry·party·categoryId·mine)·페이지네이션" })
  @Get()
  list(
    @Req() req: Request,
    @Query("q") q?: string,
    @Query("status") status?: ContractStatus,
    @Query("statuses") statuses?: string,
    @Query("expiry") expiry?: string,
    @Query("party") party?: string,
    @Query("categoryId") categoryId?: string,
    @Query("mine") mine?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ): Promise<ListContractsResponse> {
    const { sub } = (req as Request & { user: JwtPayload }).user;
    const payload: ListContractsRequest = {
      q: q || undefined,
      status: status || undefined,
      statuses: statuses || undefined,
      expiry: (expiry || undefined) as ListContractsRequest["expiry"],
      party: party || undefined,
      categoryId: categoryId || undefined,
      mineOf: mine === "true" ? sub : undefined,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      tenantContext: extractTenantContext(req),
    };
    return firstValueFrom(
      this.userClient
        .send<ListContractsResponse>(CONTRACT_PATTERNS.LIST, payload)
        .pipe(rpcToHttp()),
    );
  }

  @ApiOperation({ summary: "계약 단건 조회", description: "권한 없는 조회자는 비밀참조·상대회사 PII 마스킹" })
  @Get(":id")
  get(@Param("id") id: string, @Req() req: Request): Promise<ContractResponse> {
    const { sub } = (req as Request & { user: JwtPayload }).user;
    return firstValueFrom(
      this.userClient
        .send<ContractResponse>(CONTRACT_PATTERNS.GET, {
          id,
          viewerId: sub,
          tenantContext: extractTenantContext(req),
        })
        .pipe(rpcToHttp()),
    );
  }

  @ApiOperation({ summary: "계약 필드 수정", description: "관계(상대계약자/결재선/파일/참조)는 변경하지 않음" })
  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateContractDto,
    @Req() req: Request,
  ): Promise<ContractResponse> {
    const { sub } = (req as Request & { user: JwtPayload }).user;
    const payload: UpdateContractRequest = {
      ...dto,
      id,
      viewerId: sub,
      tenantContext: extractTenantContext(req),
    };
    return firstValueFrom(
      this.userClient
        .send<ContractResponse>(CONTRACT_PATTERNS.UPDATE, payload)
        .pipe(rpcToHttp()),
    );
  }

  @ApiOperation({ summary: "계약 상태 전이", description: "허용된 전이만 가능" })
  @Patch(":id/status")
  updateStatus(
    @Param("id") id: string,
    @Body() dto: UpdateContractStatusDto,
    @Req() req: Request,
  ): Promise<ContractResponse> {
    const { sub } = (req as Request & { user: JwtPayload }).user;
    const payload: UpdateContractStatusRequest = {
      ...dto,
      id,
      viewerId: sub,
      tenantContext: extractTenantContext(req),
    };
    return firstValueFrom(
      this.userClient
        .send<ContractResponse>(CONTRACT_PATTERNS.UPDATE_STATUS, payload)
        .pipe(rpcToHttp()),
    );
  }

  @ApiOperation({
    summary: "체결 품의 상신",
    description: "요청자 본인 + 검토 완료(reviewDone) 상태에서만. 결재선 스냅샷으로 결재 시작 + 계약은 체결 진행(signing) 전이.",
  })
  @Post(":id/approval/submit")
  submitApproval(
    @Param("id") id: string,
    @Req() req: Request,
  ): Promise<ContractResponse> {
    const { sub } = (req as Request & { user: JwtPayload }).user;
    const payload: SubmitContractApprovalRequest = {
      id,
      viewerId: sub,
      tenantContext: extractTenantContext(req),
    };
    return firstValueFrom(
      this.userClient
        .send<SubmitContractApprovalResult>(CONTRACT_PATTERNS.SUBMIT_APPROVAL, payload)
        .pipe(
          rpcToHttp(),
          map((result: SubmitContractApprovalResult) => {
            result.notifications.forEach((n) =>
              this.hub.push(n.recipientId, n.notification),
            );
            return result.contract;
          }),
        ),
    );
  }

  @ApiOperation({
    summary: "체결 처리",
    description:
      "인감 담당(sealManager) + 체결 진행(signing) + 결재 전원 승인 상태에서만. 서명본 파일 승격 + signedAt 확정 + signed 전이.",
  })
  @Post(":id/complete-signing")
  completeSigning(
    @Param("id") id: string,
    @Body() body: CompleteSigningDto,
    @Req() req: Request,
  ): Promise<ContractResponse> {
    const { sub } = (req as Request & { user: JwtPayload }).user;
    const payload: CompleteSigningRequest = {
      contractId: id,
      viewerId: sub,
      signedAt: body.signedAt,
      fileId: body.fileId,
      note: body.note ?? null,
      tenantContext: extractTenantContext(req),
    };
    return firstValueFrom(
      this.userClient
        .send<CompleteSigningResult>(CONTRACT_PATTERNS.COMPLETE_SIGNING, payload)
        .pipe(
          rpcToHttp(),
          map((result: CompleteSigningResult) => result.contract),
        ),
    );
  }

  @ApiOperation({
    summary: "체결 완료 등록 확정",
    description:
      "체결 완료 등록(registerAs=signed)으로 만든 미배정 계약을, 실제 서명본 업로드 후 생성자 본인이 signed 로 확정. 결재선 없음(completeSigning과 별개).",
  })
  @Post(":id/finalize")
  finalizeRegistration(
    @Param("id") id: string,
    @Body() body: FinalizeRegistrationDto,
    @Req() req: Request,
  ): Promise<ContractResponse> {
    const { sub } = (req as Request & { user: JwtPayload }).user;
    const payload: FinalizeRegistrationRequest = {
      contractId: id,
      viewerId: sub,
      signedAt: body.signedAt,
      tenantContext: extractTenantContext(req),
    };
    return firstValueFrom(
      this.userClient
        .send<FinalizeRegistrationResult>(CONTRACT_PATTERNS.FINALIZE_REGISTRATION, payload)
        .pipe(
          rpcToHttp(),
          map((result: FinalizeRegistrationResult) => result.contract),
        ),
    );
  }

  @ApiOperation({
    summary: "서명본 교체",
    description:
      "체결된 계약(signed·fulfilling·closed)에서 법무팀만. 새로 첨부한 파일을 서명본으로 올리고 기존 서명본은 첨부로 내려 이력 보존, 사유는 감사 로그에 기록.",
  })
  @Post(":id/signed-file/replace")
  replaceSignedFile(
    @Param("id") id: string,
    @Body() body: ReplaceSignedFileDto,
    @Req() req: Request,
  ): Promise<ContractResponse> {
    const { sub } = (req as Request & { user: JwtPayload }).user;
    const payload: ReplaceSignedFileRequest = {
      contractId: id,
      viewerId: sub,
      fileId: body.fileId,
      reason: body.reason,
      tenantContext: extractTenantContext(req),
    };
    return firstValueFrom(
      this.userClient
        .send<ReplaceSignedFileResult>(CONTRACT_PATTERNS.REPLACE_SIGNED_FILE, payload)
        .pipe(
          rpcToHttp(),
          map((result: ReplaceSignedFileResult) => result.contract),
        ),
    );
  }

  @ApiOperation({ summary: "계약 코멘트 작성", description: "관련자(조회 권한 보유자)만 작성 가능" })
  @Post(":id/comments")
  createComment(
    @Param("id") id: string,
    @Body() dto: CreateCommentDto,
    @Req() req: Request,
  ): Promise<CommentDto> {
    const { sub } = (req as Request & { user: JwtPayload }).user;
    const payload: CreateCommentRequest = {
      contractId: id,
      body: dto.body,
      mentions: dto.mentions,
      attachmentIds: dto.attachmentIds,
      viewerId: sub,
      tenantContext: extractTenantContext(req),
    };
    return firstValueFrom(
      this.userClient
        .send<CreateCommentResult>(COMMENT_PATTERNS.CREATE, payload)
        .pipe(
          rpcToHttp(),
          map((result: CreateCommentResult) => {
            result.notifications.forEach((n) =>
              this.hub.push(n.recipientId, n.notification),
            );
            return result.comment;
          }),
        ),
    );
  }

  @ApiOperation({ summary: "계약 코멘트 목록 조회", description: "관련자(조회 권한 보유자)만 조회 가능" })
  @Get(":id/comments")
  listComments(
    @Param("id") id: string,
    @Req() req: Request,
  ): Promise<CommentDto[]> {
    const { sub } = (req as Request & { user: JwtPayload }).user;
    const payload: ListCommentsRequest = {
      contractId: id,
      viewerId: sub,
      tenantContext: extractTenantContext(req),
    };
    return firstValueFrom(
      this.userClient
        .send<CommentDto[]>(COMMENT_PATTERNS.LIST, payload)
        .pipe(rpcToHttp()),
    );
  }

  @ApiOperation({ summary: "계약 코멘트 수정", description: "작성자 본인만 수정 가능(body·멘션 전체 교체)" })
  @Patch(":id/comments/:commentId")
  updateComment(
    @Param("id") id: string,
    @Param("commentId") commentId: string,
    @Body() dto: UpdateCommentDto,
    @Req() req: Request,
  ): Promise<CommentDto> {
    const { sub } = (req as Request & { user: JwtPayload }).user;
    const payload: UpdateCommentRequest = {
      contractId: id,
      commentId,
      body: dto.body,
      mentions: dto.mentions,
      attachmentIds: dto.attachmentIds,
      viewerId: sub,
      tenantContext: extractTenantContext(req),
    };
    return firstValueFrom(
      this.userClient
        .send<CreateCommentResult>(COMMENT_PATTERNS.UPDATE, payload)
        .pipe(
          rpcToHttp(),
          map((result: CreateCommentResult) => {
            result.notifications.forEach((n) =>
              this.hub.push(n.recipientId, n.notification),
            );
            return result.comment;
          }),
        ),
    );
  }

  @ApiOperation({ summary: "계약 코멘트 삭제", description: "작성자 본인만 삭제 가능(소프트 삭제)" })
  @Delete(":id/comments/:commentId")
  deleteComment(
    @Param("id") id: string,
    @Param("commentId") commentId: string,
    @Req() req: Request,
  ): Promise<CommentDto> {
    const { sub } = (req as Request & { user: JwtPayload }).user;
    const payload: DeleteCommentRequest = {
      contractId: id,
      commentId,
      viewerId: sub,
      tenantContext: extractTenantContext(req),
    };
    return firstValueFrom(
      this.userClient
        .send<CommentDto>(COMMENT_PATTERNS.DELETE, payload)
        .pipe(rpcToHttp()),
    );
  }
}
