import { Injectable, Logger } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../contracts/contracts.audit";
import { NotificationService } from "../notifications/notifications.service";
import { MailService } from "../mail/mail.service";
import { evaluate, listRelatedUserIds } from "../contracts/contracts.authz";
import type { AuthzViewer, AuthzContract } from "../contracts/contracts.authz";
import type {
  CommentDto,
  CreateCommentRequest,
  CreateCommentResult,
  ListCommentsRequest,
  UpdateCommentRequest,
  DeleteCommentRequest,
} from "@lawai/contracts";

// 코멘트 권한 평가에 필요한 계약 행(references 포함 — cc 사용자 추출용).
const contractAuthzInclude = {
  references: true,
} satisfies Prisma.ContractInclude;

type ContractForAuthz = Prisma.ContractGetPayload<{
  include: typeof contractAuthzInclude;
}>;

// 코멘트 + 작성자 이름(authorName 매핑용) + 멘션(userId+이름).
const commentInclude = {
  author: { select: { name: true } },
  mentions: { include: { user: { select: { id: true, name: true } } } },
} satisfies Prisma.CommentInclude;

type CommentWithAuthor = Prisma.CommentGetPayload<{
  include: typeof commentInclude;
}>;

// references 중 ccType==="user" 인 행들의 refId(= cc 사용자 id) 배열 추출.
const extractCcUserIds = (
  refs: { ccType: string; refId: string }[],
): string[] => refs.filter((r) => r.ccType === "user").map((r) => r.refId);

// 알림 detail.preview 최대 길이(코멘트 본문 미리보기). 개행은 공백으로 정규화 후 slice.
const PREVIEW_LEN = 80;

// `@[표시이름](userId)` 마크업을 `@표시이름`으로 치환한다(preview/요약용).
// 프론트 apps/web/src/pages/contract/utils/mentionMarkup.ts stripMentionMarkup와
// 1:1 동일 — 패턴을 바꾸면 양쪽을 함께 수정해야 한다(드리프트 시 미리보기 깨짐).
const stripMentionMarkup = (body: string): string =>
  body.replace(/@\[([^\]]+)\]\(([^)]+)\)/g, "@$1");

// 코멘트 본문 → 알림 미리보기 텍스트(멘션 마크업 strip + 개행 정규화 + 길이 제한).
const buildPreview = (body: string): string => {
  const stripped = stripMentionMarkup(body);
  const normalized = stripped.replace(/\s+/g, " ").trim();
  return normalized.slice(0, PREVIEW_LEN);
};

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
  private readonly logger = new Logger(CommentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationService,
    private readonly mail: MailService,
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

  // 멘션 수신자 email/name/emailNotify 일괄 조회(N+1 회피, notifications.loadActorNames 패턴).
  // userIds 비면 [] 반환(쿼리 skip).
  private async loadEmailRecipients(
    userIds: string[],
  ): Promise<
    { id: string; email: string; name: string; emailNotify: boolean }[]
  > {
    if (userIds.length === 0) return [];
    return this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true, name: true, emailNotify: true },
    });
  }

  // 멘션 이메일 발송(best-effort). 인앱 알림 직후 호출 — 코멘트 응답/인앱 흐름을 막지 않는다.
  // - 발송 대상은 emailNotify === true 인 수신자만(수신 거부 스킵).
  // - actorName 은 actor(viewer 본인) 이름 1건 조회로 확보(AuthzViewer 에 name 없음).
  // - Promise.allSettled 로 병렬 + 개별 실패 격리. 발송 자체가 throw 해도 swallow.
  private async sendMentionEmails(args: {
    recipientUserIds: string[];
    actorId: string;
    contractTitle: string;
    contractId: string;
    preview: string;
  }): Promise<void> {
    const { recipientUserIds, actorId, contractTitle, contractId, preview } =
      args;
    if (recipientUserIds.length === 0) return;

    try {
      const [recipients, actor] = await Promise.all([
        this.loadEmailRecipients(recipientUserIds),
        this.prisma.user.findUnique({
          where: { id: actorId },
          select: { name: true },
        }),
      ]);
      const actorName = actor?.name ?? "알 수 없는 사용자";
      const targets = recipients.filter((r) => r.emailNotify && r.email);

      await Promise.allSettled(
        targets.map((r) =>
          this.mail.sendMentionEmail({
            to: r.email,
            recipientName: r.name,
            actorName,
            contractTitle,
            contractId,
            preview,
          }),
        ),
      );
    } catch (error) {
      // best-effort: 수신자/actor 조회 실패 등도 코멘트 흐름을 깨지 않게 swallow.
      this.logger.error("멘션 이메일 발송 단계 실패(무시)", error as Error);
    }
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
  // - viewerId: isAuthor 산출(작성자 본인 여부 → 프론트 수정/삭제 버튼 노출).
  // - 소프트삭제(deletedAt) 행은 body placeholder(빈 문자열)·mentions=[]·isDeleted=true 로
  //   직렬화해 목록 맥락은 보존하되 내용/멘션은 숨긴다(plan 26/T4-1).
  private toDto(row: CommentWithAuthor, viewerId?: string): CommentDto {
    const isDeleted = Boolean(row.deletedAt);
    return {
      id: row.id,
      contractId: row.contractId,
      authorId: row.authorId,
      authorName: row.author.name,
      role: row.role,
      body: isDeleted ? "" : row.body,
      mentions: isDeleted
        ? []
        : row.mentions.map((m) => ({ userId: m.userId, name: m.user.name })),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      isDeleted,
      isAuthor: row.authorId === viewerId,
    };
  }

  // 멘션 대상(userId[])이 전부 계약 관련자 집합에 포함되는지 검증.
  // - 비관련자가 하나라도 있으면 400. dedupe 한 통과 목록을 반환(unique 충돌 회피).
  // - 빈/미지정이면 빈 배열(멘션 없음).
  private validateMentions(
    contract: ContractForAuthz,
    mentions?: string[],
  ): string[] {
    const requested = Array.from(new Set(mentions ?? []));
    if (requested.length === 0) return [];

    const related = new Set(listRelatedUserIds(this.toAuthzContract(contract)));
    const invalid = requested.filter((id) => !related.has(id));
    if (invalid.length > 0) {
      throw new RpcException({
        status: 400,
        message: "멘션 대상은 계약 관련자여야 합니다",
      });
    }
    return requested;
  }

  async create(req: CreateCommentRequest): Promise<CreateCommentResult> {
    const body = req.body?.trim();
    if (!body) {
      throw new RpcException({
        status: 400,
        message: "코멘트 내용을 입력하세요",
      });
    }

    const contract = await this.loadContract(req.contractId);
    const viewer = await this.authorizeViewer(contract, req.viewerId);
    const mentionUserIds = this.validateMentions(contract, req.mentions);

    // comment 본체 + 멘션 행 동기화를 트랜잭션으로 원자적 처리.
    const comment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.comment.create({
        data: {
          contractId: req.contractId,
          authorId: viewer.id,
          role: viewer.role,
          body,
        },
      });
      if (mentionUserIds.length > 0) {
        await tx.commentMention.createMany({
          data: mentionUserIds.map((userId) => ({
            commentId: created.id,
            userId,
          })),
          skipDuplicates: true,
        });
      }
      return tx.comment.findUniqueOrThrow({
        where: { id: created.id },
        include: commentInclude,
      });
    });

    await this.audit.record({
      action: "create",
      targetType: "Comment",
      targetId: comment.id,
      actorId: viewer.id,
      detail: { contractId: req.contractId, role: viewer.role },
    });

    // 멘션 알림(best-effort, 트랜잭션 밖 — audit 옆). 자기멘션 제외(NotificationService 가 방어적 필터).
    // createMany 가 생성된 PushNotification[] 를 반환 → gateway 가 SSE fan-out 에 사용.
    const preview = buildPreview(body);
    const notifications = await this.notifications.createMany(
      mentionUserIds
        .filter((userId) => userId !== viewer.id)
        .map((userId) => ({
          recipientId: userId,
          type: "comment_mention",
          actorId: viewer.id,
          targetType: "Comment",
          targetId: comment.id,
          detail: { contractId: req.contractId, preview },
        })),
    );

    // 멘션 이메일(best-effort, 인앱 알림과 독립). emailNotify=true 수신자만, 자기멘션 제외.
    // contract.title 은 loadContract row 에 스칼라로 이미 포함(추가 쿼리 X).
    await this.sendMentionEmails({
      recipientUserIds: mentionUserIds.filter(
        (userId) => userId !== viewer.id,
      ),
      actorId: viewer.id,
      contractTitle: contract.title,
      contractId: req.contractId,
      preview,
    });

    return { comment: this.toDto(comment, viewer.id), notifications };
  }

  async update(req: UpdateCommentRequest): Promise<CreateCommentResult> {
    const body = req.body?.trim();
    if (!body) {
      throw new RpcException({
        status: 400,
        message: "코멘트 내용을 입력하세요",
      });
    }

    const contract = await this.loadContract(req.contractId);
    const viewer = await this.authorizeViewer(contract, req.viewerId);

    // 코멘트 조회(삭제분 포함 — 삭제 상태 판정에 필요).
    const existing = await this.prisma.comment.findFirst({
      where: { id: req.commentId, contractId: req.contractId },
    });
    if (!existing) {
      throw new RpcException({
        status: 404,
        message: "코멘트를 찾을 수 없습니다",
      });
    }
    // 본인만 수정(admin 예외 없음).
    if (existing.authorId !== viewer.id) {
      throw new RpcException({
        status: 403,
        message: "본인 코멘트만 수정할 수 있습니다",
      });
    }
    // 삭제된 코멘트는 수정 불가.
    if (existing.deletedAt) {
      throw new RpcException({
        status: 400,
        message: "삭제된 코멘트는 수정할 수 없습니다",
      });
    }

    const mentionUserIds = this.validateMentions(contract, req.mentions);

    // body 갱신 + 멘션 전체 교체(deleteMany→createMany)를 트랜잭션으로. updatedAt 은 @updatedAt 자동.
    // 멘션 알림 diff 를 위해 교체 전 기존 멘션 userId 집합(prevSet)을 deleteMany 직전 같은 tx 에서 확보.
    const { comment, prevUserIds } = await this.prisma.$transaction(
      async (tx) => {
        await tx.comment.update({
          where: { id: req.commentId },
          data: { body },
        });
        const prevMentions = await tx.commentMention.findMany({
          where: { commentId: req.commentId },
          select: { userId: true },
        });
        await tx.commentMention.deleteMany({
          where: { commentId: req.commentId },
        });
        if (mentionUserIds.length > 0) {
          await tx.commentMention.createMany({
            data: mentionUserIds.map((userId) => ({
              commentId: req.commentId,
              userId,
            })),
            skipDuplicates: true,
          });
        }
        const reloaded = await tx.comment.findUniqueOrThrow({
          where: { id: req.commentId },
          include: commentInclude,
        });
        return {
          comment: reloaded,
          prevUserIds: prevMentions.map((m) => m.userId),
        };
      },
    );

    await this.audit.record({
      action: "update",
      targetType: "Comment",
      targetId: comment.id,
      actorId: viewer.id,
      detail: { contractId: req.contractId },
    });

    // 신규 추가된 멘션만 알림(diff): prevSet 에 없던 userId + 자기멘션 제외. best-effort.
    const prevSet = new Set(prevUserIds);
    const addedUserIds = mentionUserIds.filter(
      (userId) => !prevSet.has(userId) && userId !== viewer.id,
    );
    const preview = buildPreview(body);
    const notifications = await this.notifications.createMany(
      addedUserIds.map((userId) => ({
        recipientId: userId,
        type: "comment_mention",
        actorId: viewer.id,
        targetType: "Comment",
        targetId: comment.id,
        detail: { contractId: req.contractId, preview },
      })),
    );

    // 멘션 이메일(best-effort): 신규 추가된 멘션(addedUserIds)만, emailNotify=true 수신자.
    await this.sendMentionEmails({
      recipientUserIds: addedUserIds,
      actorId: viewer.id,
      contractTitle: contract.title,
      contractId: req.contractId,
      preview,
    });

    return { comment: this.toDto(comment, viewer.id), notifications };
  }

  async delete(req: DeleteCommentRequest): Promise<CommentDto> {
    const contract = await this.loadContract(req.contractId);
    const viewer = await this.authorizeViewer(contract, req.viewerId);

    const existing = await this.prisma.comment.findFirst({
      where: { id: req.commentId, contractId: req.contractId },
    });
    if (!existing) {
      throw new RpcException({
        status: 404,
        message: "코멘트를 찾을 수 없습니다",
      });
    }
    // 본인만 삭제(admin 예외 없음).
    if (existing.authorId !== viewer.id) {
      throw new RpcException({
        status: 403,
        message: "본인 코멘트만 삭제할 수 있습니다",
      });
    }

    // 이미 삭제됐으면 멱등 — 기존 행을 그대로 직렬화해 반환(감사 중복 방지).
    if (existing.deletedAt) {
      const current = await this.prisma.comment.findUniqueOrThrow({
        where: { id: req.commentId },
        include: commentInclude,
      });
      return this.toDto(current, viewer.id);
    }

    // 소프트 삭제(deletedAt set). 멘션 행은 보존(DTO 에서만 숨김).
    const comment = await this.prisma.comment.update({
      where: { id: req.commentId },
      data: { deletedAt: new Date() },
      include: commentInclude,
    });

    await this.audit.record({
      action: "delete",
      targetType: "Comment",
      targetId: comment.id,
      actorId: viewer.id,
      detail: { contractId: req.contractId },
    });

    return this.toDto(comment, viewer.id);
  }

  async list(req: ListCommentsRequest): Promise<CommentDto[]> {
    const contract = await this.loadContract(req.contractId);
    const viewer = await this.authorizeViewer(contract, req.viewerId);

    // 삭제 행 제외 금지 — placeholder 로 직렬화해 맥락 보존(plan T4-5).
    const rows = await this.prisma.comment.findMany({
      where: { contractId: req.contractId },
      orderBy: { createdAt: "asc" },
      include: commentInclude,
    });

    return rows.map((row) => this.toDto(row, viewer.id));
  }
}
