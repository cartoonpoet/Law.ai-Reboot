import { Injectable } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../contracts/contracts.audit";
import { evaluate } from "../contracts/contracts.authz";
import type { AuthzViewer, AuthzContract } from "../contracts/contracts.authz";
import type {
  CommentDto,
  CreateCommentRequest,
  ListCommentsRequest,
} from "@lawai/contracts";

// 코멘트 권한 평가에 필요한 계약 행(references 포함 — cc 사용자 추출용).
const contractAuthzInclude = {
  references: true,
} satisfies Prisma.ContractInclude;

type ContractForAuthz = Prisma.ContractGetPayload<{
  include: typeof contractAuthzInclude;
}>;

// 코멘트 + 작성자 이름(authorName 매핑용).
const commentInclude = {
  author: { select: { name: true } },
} satisfies Prisma.CommentInclude;

type CommentWithAuthor = Prisma.CommentGetPayload<{
  include: typeof commentInclude;
}>;

// references 중 ccType==="user" 인 행들의 refId(= cc 사용자 id) 배열 추출.
const extractCcUserIds = (
  refs: { ccType: string; refId: string }[],
): string[] => refs.filter((r) => r.ccType === "user").map((r) => r.refId);

/**
 * 계약 코멘트 도메인 서비스(생성/조회).
 *
 * - 권한: 계약 authz `evaluate(...).canView` 통과자만 코멘트 작성/조회 가능.
 *   contracts.authz 는 순수 함수라 그대로 import 해 재사용(이중 정책 금지).
 *   → 법무팀(inHouseCounsel/contractManager, view:"all")은 전체 계약에,
 *     general 은 본인 관련(related) 계약에만 코멘트 가능. owner/creator/requester/cc 포함.
 * - 작성자(authorId)는 gateway 가 주입한 viewerId(JWT sub). role 은 작성 시점 스냅.
 * - 감사: 생성 시 best-effort 1건(action:"create", targetType:"Comment").
 */
@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // viewer(role/departmentId) 조회. viewerId 없거나 미존재면 null(evaluate 안전 기본).
  private async loadViewer(viewerId?: string): Promise<AuthzViewer | null> {
    if (!viewerId) return null;
    const user = await this.prisma.user.findUnique({
      where: { id: viewerId },
    });
    if (!user) return null;
    return { id: user.id, role: user.role, departmentId: user.departmentId };
  }

  // 계약 행 → 권한 평가용 AuthzContract.
  private toAuthzContract(row: ContractForAuthz): AuthzContract {
    return {
      createdById: row.createdById,
      ownerId: row.ownerId,
      requesterId: row.requesterId,
      ccUserIds: extractCcUserIds(row.references),
      status: row.status,
      securityLevel: row.securityLevel,
      departmentId: row.departmentId,
    };
  }

  // 삭제되지 않은 계약 로드(없으면 404). 권한 평가에 references 필요.
  private async loadContract(contractId: string): Promise<ContractForAuthz> {
    const row = await this.prisma.contract.findFirst({
      where: { id: contractId, deletedAt: null },
      include: contractAuthzInclude,
    });
    if (!row) {
      throw new RpcException({ status: 404, message: "계약을 찾을 수 없습니다" });
    }
    return row;
  }

  // canView 통과 viewer 를 보장(미통과 403). 반환 viewer 는 작성/스냅에 사용.
  private async authorizeViewer(
    contract: ContractForAuthz,
    viewerId?: string,
  ): Promise<AuthzViewer> {
    const viewer = await this.loadViewer(viewerId);
    const authz = evaluate(viewer, this.toAuthzContract(contract));
    if (!viewer || !authz.canView) {
      throw new RpcException({
        status: 403,
        message: "코멘트 권한이 없습니다",
      });
    }
    return viewer;
  }

  // CommentWithAuthor row → CommentDto.
  private toDto(row: CommentWithAuthor): CommentDto {
    return {
      id: row.id,
      contractId: row.contractId,
      authorId: row.authorId,
      authorName: row.author.name,
      role: row.role,
      body: row.body,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async create(req: CreateCommentRequest): Promise<CommentDto> {
    const body = req.body?.trim();
    if (!body) {
      throw new RpcException({
        status: 400,
        message: "코멘트 내용을 입력하세요",
      });
    }

    const contract = await this.loadContract(req.contractId);
    const viewer = await this.authorizeViewer(contract, req.viewerId);

    const comment = await this.prisma.comment.create({
      data: {
        contractId: req.contractId,
        authorId: viewer.id,
        role: viewer.role,
        body,
      },
      include: commentInclude,
    });

    await this.audit.record({
      action: "create",
      targetType: "Comment",
      targetId: comment.id,
      actorId: viewer.id,
      detail: { contractId: req.contractId, role: viewer.role },
    });

    return this.toDto(comment);
  }

  async list(req: ListCommentsRequest): Promise<CommentDto[]> {
    const contract = await this.loadContract(req.contractId);
    await this.authorizeViewer(contract, req.viewerId);

    const rows = await this.prisma.comment.findMany({
      where: { contractId: req.contractId },
      orderBy: { createdAt: "asc" },
      include: commentInclude,
    });

    return rows.map((row) => this.toDto(row));
  }
}
