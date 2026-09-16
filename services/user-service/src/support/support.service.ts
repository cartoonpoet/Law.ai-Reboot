import { Injectable } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import type { Prisma } from "@prisma/client";
import type {
  AddSupportMessageRequest,
  AdminGetSupportThreadRequest,
  AdminReplySupportRequest,
  AdminReplySupportResult,
  AdminSupportListRequest,
  AdminSupportListResponse,
  AdminSupportThreadDetail,
  AdminSupportThreadRow,
  CreateSupportThreadRequest,
  GetSupportThreadRequest,
  ListMySupportThreadsRequest,
  ListMySupportThreadsResponse,
  SupportContext,
  SupportMessageDto,
  SupportThreadDetail,
  SupportThreadDto,
} from "@lawai/contracts";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationService } from "../notifications/notifications.service";

const SUBJECT_MAX_LENGTH = 120;
const PREVIEW_MAX_LENGTH = 80;
const ADMIN_DEFAULT_LIMIT = 20;
const ADMIN_MAX_LIMIT = 100;

const THREAD_NOT_FOUND = "문의를 찾을 수 없습니다";
const EMPTY_BODY_MESSAGE = "내용을 입력해 주세요";
const NO_TENANT_MESSAGE = "회사 정보가 없어 문의를 남길 수 없습니다";
const CLOSED_THREAD_MESSAGE = "종료된 문의예요. 새 문의를 남겨 주세요";

type ThreadRow = Prisma.SupportThreadGetPayload<{ include: { messages: true } }>;
type MessageRow = ThreadRow["messages"][number];

// 목록에 보여줄 한 줄 — 줄바꿈을 지우고 너무 길면 자른다.
const toPreview = (body: string): string => {
  const flat = body.replace(/\s+/g, " ").trim();
  return flat.length > PREVIEW_MAX_LENGTH ? `${flat.slice(0, PREVIEW_MAX_LENGTH)}…` : flat;
};

const requireText = (value: string, message: string): string => {
  const text = value?.trim() ?? "";
  if (text.length === 0) throw new RpcException({ status: 400, message });
  return text;
};

const getTenantId = (context: { tenantId?: string }): string => {
  if (!context?.tenantId) throw new RpcException({ status: 400, message: NO_TENANT_MESSAGE });
  return context.tenantId;
};

/**
 * 문의·상담 — 사용자가 AI 비서에서 남긴 문의와 관리자 답변을 한 스레드로 관리한다.
 * 관리자가 답하면 알림(support_reply)을 만들어 돌려주고, 게이트웨이가 그걸 SSE 로 밀어 바로 보이게 한다.
 */
@Injectable()
export class SupportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
  ) {}

  async createThread(req: CreateSupportThreadRequest): Promise<SupportThreadDetail> {
    const tenantId = getTenantId(req.tenantContext);
    const subject = requireText(req.subject, "제목을 입력해 주세요").slice(0, SUBJECT_MAX_LENGTH);
    const body = requireText(req.body, EMPTY_BODY_MESSAGE);

    const thread = await this.prisma.supportThread.create({
      data: {
        tenantId,
        userId: req.userId,
        subject,
        context: (req.context ?? undefined) as Prisma.InputJsonValue | undefined,
        messages: { create: { authorId: req.userId, authorRole: "user", body } },
      },
      include: { messages: true },
    });
    return this.toThreadDetail(thread);
  }

  async listMyThreads(req: ListMySupportThreadsRequest): Promise<ListMySupportThreadsResponse> {
    const tenantId = getTenantId(req.tenantContext);
    const threads = await this.prisma.supportThread.findMany({
      where: { userId: req.userId, tenantId },
      orderBy: { lastMessageAt: "desc" },
      include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
    });
    return {
      threads: threads.map((thread) => this.toThreadDto(thread)),
      answeredCount: threads.filter((thread) => thread.status === "answered").length,
    };
  }

  async getThread(req: GetSupportThreadRequest): Promise<SupportThreadDetail> {
    const thread = await this.loadMyThread(req.threadId, req.userId, getTenantId(req.tenantContext));
    return this.toThreadDetail(thread);
  }

  async addMessage(req: AddSupportMessageRequest): Promise<SupportThreadDetail> {
    const tenantId = getTenantId(req.tenantContext);
    const body = requireText(req.body, EMPTY_BODY_MESSAGE);
    const thread = await this.loadMyThread(req.threadId, req.userId, tenantId);
    if (thread.status === "closed") {
      throw new RpcException({ status: 409, message: CLOSED_THREAD_MESSAGE });
    }

    const updated = await this.prisma.supportThread.update({
      where: { id: thread.id },
      // 사용자가 다시 말했으니 답변 대기로 되돌린다.
      data: {
        status: "open",
        lastMessageAt: new Date(),
        messages: { create: { authorId: req.userId, authorRole: "user", body } },
      },
      include: { messages: true },
    });
    return this.toThreadDetail(updated);
  }

  async adminList(req: AdminSupportListRequest): Promise<AdminSupportListResponse> {
    const limit = Math.min(Math.max(1, req.limit ?? ADMIN_DEFAULT_LIMIT), ADMIN_MAX_LIMIT);
    const offset = Math.max(0, req.offset ?? 0);
    const where = req.status ? { status: req.status } : {};
    const [threads, total, openCount] = await Promise.all([
      this.prisma.supportThread.findMany({
        where,
        orderBy: { lastMessageAt: "desc" },
        take: limit,
        skip: offset,
        include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
      }),
      this.prisma.supportThread.count({ where }),
      this.prisma.supportThread.count({ where: { status: "open" } }),
    ]);
    return { items: await this.attachOwners(threads), total, openCount };
  }

  async adminGet(req: AdminGetSupportThreadRequest): Promise<AdminSupportThreadDetail> {
    const thread = await this.prisma.supportThread.findUnique({
      where: { id: req.threadId },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    if (!thread) throw new RpcException({ status: 404, message: THREAD_NOT_FOUND });
    return this.toAdminDetail(thread);
  }

  async adminReply(req: AdminReplySupportRequest): Promise<AdminReplySupportResult> {
    const body = requireText(req.body, EMPTY_BODY_MESSAGE);
    const existing = await this.prisma.supportThread.findUnique({ where: { id: req.threadId } });
    if (!existing) throw new RpcException({ status: 404, message: THREAD_NOT_FOUND });

    const thread = await this.prisma.supportThread.update({
      where: { id: existing.id },
      data: {
        status: req.close ? "closed" : "answered",
        lastMessageAt: new Date(),
        messages: { create: { authorId: req.actorId, authorRole: "admin", body } },
      },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });

    // 답변 알림 — 게이트웨이가 SSE 로 밀어 문의한 사람 화면에 바로 뜬다.
    const notifications = await this.notifications.createMany([
      {
        recipientId: thread.userId,
        type: "support_reply",
        actorId: req.actorId,
        targetType: "SupportThread",
        targetId: thread.id,
        tenantId: thread.tenantId,
        detail: { threadId: thread.id, subject: thread.subject, preview: toPreview(body) },
      },
    ]);

    return { thread: await this.toAdminDetail(thread), notifications };
  }

  private async loadMyThread(threadId: string, userId: string, tenantId: string): Promise<ThreadRow> {
    const thread = await this.prisma.supportThread.findFirst({
      where: { id: threadId, userId, tenantId },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    if (!thread) throw new RpcException({ status: 404, message: THREAD_NOT_FOUND });
    return thread;
  }

  private toThreadDto(thread: {
    id: string;
    subject: string;
    status: string;
    context: unknown;
    lastMessageAt: Date;
    createdAt: Date;
    messages: MessageRow[];
  }): SupportThreadDto {
    // 목록은 마지막 1건만, 상세는 전체를 담아 오므로 마지막 메시지는 시각으로 고른다.
    const last = thread.messages.reduce<MessageRow | null>(
      (latest, message) => (!latest || message.createdAt > latest.createdAt ? message : latest),
      null,
    );
    return {
      id: thread.id,
      subject: thread.subject,
      status: thread.status as SupportThreadDto["status"],
      context: (thread.context as SupportContext | null) ?? null,
      lastMessageAt: thread.lastMessageAt.toISOString(),
      createdAt: thread.createdAt.toISOString(),
      lastMessagePreview: last ? toPreview(last.body) : "",
      lastMessageRole: (last?.authorRole ?? "user") as SupportThreadDto["lastMessageRole"],
    };
  }

  private async toThreadDetail(thread: ThreadRow): Promise<SupportThreadDetail> {
    const nameById = await this.loadAuthorNames(thread.messages);
    return {
      ...this.toThreadDto(thread),
      messages: thread.messages
        .slice()
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        .map((message) => this.toMessageDto(message, nameById)),
    };
  }

  private async toAdminDetail(
    thread: ThreadRow & { userId: string; tenantId: string },
  ): Promise<AdminSupportThreadDetail> {
    const [row] = await this.attachOwners([thread]);
    const nameById = await this.loadAuthorNames(thread.messages);
    return {
      ...row,
      messages: thread.messages.map((message) => this.toMessageDto(message, nameById)),
    };
  }

  private toMessageDto(message: MessageRow, nameById: Map<string, string>): SupportMessageDto {
    return {
      id: message.id,
      authorId: message.authorId,
      authorRole: message.authorRole as SupportMessageDto["authorRole"],
      authorName: nameById.get(message.authorId) ?? null,
      body: message.body,
      createdAt: message.createdAt.toISOString(),
    };
  }

  /** 글쓴이 이름을 한 번에 조회(N+1 회피). 지워진 사용자는 null. */
  private async loadAuthorNames(messages: MessageRow[]): Promise<Map<string, string>> {
    const ids = Array.from(new Set(messages.map((message) => message.authorId)));
    if (ids.length === 0) return new Map();
    const users = await this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true },
    });
    return new Map(users.map((user) => [user.id, user.name]));
  }

  /** 관리자 목록용 — 문의한 사람과 회사 이름을 한 번에 붙인다. */
  private async attachOwners(
    threads: (Parameters<SupportService["toThreadDto"]>[0] & { userId: string; tenantId: string })[],
  ): Promise<AdminSupportThreadRow[]> {
    const userIds = Array.from(new Set(threads.map((thread) => thread.userId)));
    const tenantIds = Array.from(new Set(threads.map((thread) => thread.tenantId)));
    const noUsers: { id: string; name: string; email: string }[] = [];
    const noTenants: { id: string; name: string }[] = [];
    const [users, tenants] = await Promise.all([
      userIds.length > 0
        ? this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, name: true, email: true },
          })
        : noUsers,
      tenantIds.length > 0
        ? this.prisma.tenant.findMany({
            where: { id: { in: tenantIds } },
            select: { id: true, name: true },
          })
        : noTenants,
    ]);
    const userById = new Map(users.map((user) => [user.id, user]));
    const tenantNameById = new Map(tenants.map((tenant) => [tenant.id, tenant.name]));
    return threads.map((thread) => ({
      ...this.toThreadDto(thread),
      userId: thread.userId,
      userName: userById.get(thread.userId)?.name ?? null,
      userEmail: userById.get(thread.userId)?.email ?? null,
      tenantId: thread.tenantId,
      tenantName: tenantNameById.get(thread.tenantId) ?? null,
    }));
  }
}
