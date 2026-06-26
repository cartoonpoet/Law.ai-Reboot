import { Test } from "@nestjs/testing";
import { Logger } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import { CommentsService } from "./comments.service";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../contracts/contracts.audit";
import { NotificationService } from "../notifications/notifications.service";
import { MailService } from "../mail/mail.service";

/**
 * CommentsService 단위 테스트.
 *
 * - 가드: contracts.authz `evaluate(...).canView` 통과자만 create/list(실제 evaluate 사용 — 순수 함수).
 *   → 무관 general / viewer 미존재는 403.
 * - create: 빈 body 400, 성공 시 comment.create + role 스냅 + AuditService.record(create/Comment) 호출.
 * - list: canView 가드 + createdAt asc + CommentDto(authorName/role) 매핑.
 */
describe("CommentsService", () => {
  let service: CommentsService;

  const prismaMock = {
    contract: { findFirst: jest.fn() },
    user: { findUnique: jest.fn(), findMany: jest.fn() },
    comment: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
    commentMention: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
      findMany: jest.fn(),
    },
    // $transaction(cb) 형태(우리 service 가 사용하는 콜백 시그니처)만 모킹.
    $transaction: jest.fn(),
  };
  const auditMock = { record: jest.fn() };
  // 멘션→알림 트리거(best-effort). createMany 는 PushNotification[] 를 반환(없으면 []).
  const notificationMock = { createMany: jest.fn() };
  // 멘션→이메일 트리거(best-effort). 발송 자체는 MailService 가 책임 — 여기선 호출만 검증.
  const mailMock = { sendMentionEmail: jest.fn() };

  // 권한 평가용 계약 행(references 포함). 케이스별 owner/creator 등 덮어쓰기.
  const makeContractRow = (over: Record<string, unknown> = {}) => ({
    id: "contract-1",
    title: "비밀유지계약",
    createdById: "creator-1",
    ownerId: "owner-1",
    requesterId: "requester-1",
    status: "legalReview",
    securityLevel: "secure",
    departmentId: "dept-1",
    deletedAt: null,
    references: [],
    ...over,
  });

  const makeUser = (
    id: string,
    role: string,
    departmentId: string | null = "dept-1",
  ) => ({ id, role, departmentId, name: `${id}-name` });

  beforeEach(async () => {
    jest.clearAllMocks();
    auditMock.record.mockResolvedValue(undefined);
    notificationMock.createMany.mockResolvedValue([]);
    mailMock.sendMentionEmail.mockResolvedValue(undefined);
    prismaMock.commentMention.findMany.mockResolvedValue([]);
    prismaMock.user.findMany.mockResolvedValue([]);
    const moduleRef = await Test.createTestingModule({
      providers: [
        CommentsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: AuditService, useValue: auditMock },
        { provide: NotificationService, useValue: notificationMock },
        { provide: MailService, useValue: mailMock },
      ],
    }).compile();
    service = moduleRef.get(CommentsService);
  });

  describe("create", () => {
    it("canView 통과자(법무팀)면 코멘트를 생성하고 role 스냅 + 감사 1건을 기록한다", async () => {
      prismaMock.contract.findFirst.mockResolvedValue(makeContractRow());
      prismaMock.user.findUnique.mockResolvedValue(
        makeUser("counsel-1", "inHouseCounsel"),
      );
      const createdRow = {
        id: "comment-1",
        contractId: "contract-1",
        authorId: "counsel-1",
        role: "inHouseCounsel",
        body: "검토 의견입니다",
        createdAt: new Date("2026-06-22T01:00:00.000Z"),
        updatedAt: new Date("2026-06-22T01:00:00.000Z"),
        deletedAt: null,
        author: { name: "이법무" },
        mentions: [],
      };
      prismaMock.comment.create.mockResolvedValue(createdRow);
      // create 는 $transaction 으로 본체 생성 + 멘션 후 findUniqueOrThrow 로 재로드.
      prismaMock.comment.findUniqueOrThrow.mockResolvedValue(createdRow);
      prismaMock.$transaction.mockImplementation(
        (cb: (tx: typeof prismaMock) => unknown) => cb(prismaMock),
      );

      const result = await service.create({
        contractId: "contract-1",
        body: "검토 의견입니다",
        viewerId: "counsel-1",
      });

      // 작성자/역할 스냅 확인.
      expect(prismaMock.comment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            contractId: "contract-1",
            authorId: "counsel-1",
            role: "inHouseCounsel",
            body: "검토 의견입니다",
          },
        }),
      );
      // 감사: action create / targetType Comment.
      expect(auditMock.record).toHaveBeenCalledTimes(1);
      expect(auditMock.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "create",
          targetType: "Comment",
          targetId: "comment-1",
          actorId: "counsel-1",
        }),
      );
      // 반환은 CreateCommentResult { comment, notifications }. DTO 매핑(authorName/role/createdAt ISO + 멘션/수정/삭제/본인 필드).
      expect(result.comment).toEqual({
        id: "comment-1",
        contractId: "contract-1",
        authorId: "counsel-1",
        authorName: "이법무",
        role: "inHouseCounsel",
        body: "검토 의견입니다",
        mentions: [],
        createdAt: "2026-06-22T01:00:00.000Z",
        updatedAt: "2026-06-22T01:00:00.000Z",
        isDeleted: false,
        isAuthor: true,
      });
      // 멘션 없음 → notifications 빈 배열(createMany 빈 입력 → []).
      expect(result.notifications).toEqual([]);
    });

    it("관련 없는 general 은 canView=false → 403, 생성/감사 없음", async () => {
      prismaMock.contract.findFirst.mockResolvedValue(makeContractRow());
      // stranger general: creator/owner/requester/cc 어디에도 없음 → view:related 실패.
      prismaMock.user.findUnique.mockResolvedValue(
        makeUser("stranger", "general"),
      );

      await expect(
        service.create({
          contractId: "contract-1",
          body: "끼어들기",
          viewerId: "stranger",
        }),
      ).rejects.toBeInstanceOf(RpcException);

      expect(prismaMock.comment.create).not.toHaveBeenCalled();
      expect(auditMock.record).not.toHaveBeenCalled();
    });

    it("viewer 미존재(미인증)면 403", async () => {
      prismaMock.contract.findFirst.mockResolvedValue(makeContractRow());
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        service.create({
          contractId: "contract-1",
          body: "x",
          viewerId: "ghost",
        }),
      ).rejects.toBeInstanceOf(RpcException);
      expect(prismaMock.comment.create).not.toHaveBeenCalled();
    });

    it("빈 body(공백만)면 400 — 계약 조회 전 거부", async () => {
      await expect(
        service.create({
          contractId: "contract-1",
          body: "   ",
          viewerId: "counsel-1",
        }),
      ).rejects.toBeInstanceOf(RpcException);
      expect(prismaMock.contract.findFirst).not.toHaveBeenCalled();
      expect(prismaMock.comment.create).not.toHaveBeenCalled();
    });

    it("계약 미존재면 404", async () => {
      prismaMock.contract.findFirst.mockResolvedValue(null);
      await expect(
        service.create({
          contractId: "missing",
          body: "x",
          viewerId: "counsel-1",
        }),
      ).rejects.toBeInstanceOf(RpcException);
      expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    });

    it("관련자(owner/creator/requester/cc) 멘션이면 CommentMention.createMany 로 저장한다", async () => {
      prismaMock.contract.findFirst.mockResolvedValue(
        makeContractRow({ references: [{ ccType: "user", refId: "cc-1" }] }),
      );
      prismaMock.user.findUnique.mockResolvedValue(
        makeUser("counsel-1", "inHouseCounsel"),
      );
      const createdRow = {
        id: "comment-1",
        contractId: "contract-1",
        authorId: "counsel-1",
        role: "inHouseCounsel",
        body: "멘션 포함 의견",
        createdAt: new Date("2026-06-22T01:00:00.000Z"),
        updatedAt: new Date("2026-06-22T01:00:00.000Z"),
        deletedAt: null,
        author: { name: "이법무" },
        mentions: [
          { userId: "owner-1", user: { id: "owner-1", name: "오너" } },
          { userId: "cc-1", user: { id: "cc-1", name: "참조자" } },
        ],
      };
      prismaMock.comment.create.mockResolvedValue(createdRow);
      prismaMock.comment.findUniqueOrThrow.mockResolvedValue(createdRow);
      prismaMock.commentMention.createMany.mockResolvedValue({ count: 2 });
      prismaMock.$transaction.mockImplementation(
        (cb: (tx: typeof prismaMock) => unknown) => cb(prismaMock),
      );

      const result = await service.create({
        contractId: "contract-1",
        body: "멘션 포함 의견",
        viewerId: "counsel-1",
        mentions: ["owner-1", "cc-1"],
      });

      expect(prismaMock.commentMention.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [
            { commentId: "comment-1", userId: "owner-1" },
            { commentId: "comment-1", userId: "cc-1" },
          ],
          skipDuplicates: true,
        }),
      );
      // toDto 가 mentions(userId+name) 직렬화.
      expect(result.comment.mentions).toEqual([
        { userId: "owner-1", name: "오너" },
        { userId: "cc-1", name: "참조자" },
      ]);
    });

    it("멘션 대상에게 알림(comment_mention)을 생성하되 자기멘션(actorId===recipient)은 제외한다", async () => {
      // 작성자(viewer) = requester-1(관련자). 멘션에 본인(requester-1) 포함 → 자기멘션 제외 검증.
      prismaMock.contract.findFirst.mockResolvedValue(
        makeContractRow({ references: [{ ccType: "user", refId: "cc-1" }] }),
      );
      prismaMock.user.findUnique.mockResolvedValue(
        makeUser("requester-1", "general"),
      );
      const createdRow = {
        id: "comment-1",
        contractId: "contract-1",
        authorId: "requester-1",
        role: "general",
        body: "  멘션\n  포함   의견  ",
        createdAt: new Date("2026-06-22T01:00:00.000Z"),
        updatedAt: new Date("2026-06-22T01:00:00.000Z"),
        deletedAt: null,
        author: { name: "요청자" },
        mentions: [
          { userId: "owner-1", user: { id: "owner-1", name: "오너" } },
          { userId: "cc-1", user: { id: "cc-1", name: "참조자" } },
        ],
      };
      prismaMock.comment.create.mockResolvedValue(createdRow);
      prismaMock.comment.findUniqueOrThrow.mockResolvedValue(createdRow);
      prismaMock.commentMention.createMany.mockResolvedValue({ count: 3 });
      prismaMock.$transaction.mockImplementation(
        (cb: (tx: typeof prismaMock) => unknown) => cb(prismaMock),
      );

      await service.create({
        contractId: "contract-1",
        body: "  멘션\n  포함   의견  ",
        viewerId: "requester-1",
        // requester-1 은 작성자 본인(자기멘션) → 알림 제외 대상.
        mentions: ["owner-1", "cc-1", "requester-1"],
      });

      expect(notificationMock.createMany).toHaveBeenCalledTimes(1);
      const items = notificationMock.createMany.mock.calls[0][0] as Array<{
        recipientId: string;
        actorId: string;
        type: string;
        targetType: string;
        targetId: string;
        detail: { contractId: string; preview: string };
      }>;
      // 자기멘션(requester-1) 제외 → owner-1, cc-1 만.
      expect(items.map((i) => i.recipientId)).toEqual(["owner-1", "cc-1"]);
      expect(items.every((i) => i.actorId === "requester-1")).toBe(true);
      expect(items[0]).toEqual(
        expect.objectContaining({
          type: "comment_mention",
          targetType: "Comment",
          targetId: "comment-1",
        }),
      );
      // preview 는 개행/연속 공백 정규화 후 trim.
      expect(items[0].detail).toEqual({
        contractId: "contract-1",
        preview: "멘션 포함 의견",
      });
    });

    it("알림 preview는 본문 HTML의 멘션 span을 @label로 보존하고 그 외 태그는 strip한다", async () => {
      // P2 직렬화: 본문은 HTML 단편. 멘션은 `<span data-mention data-id>` 마크업.
      // preview는 멘션 라벨(@오너)을 보존하고 strong/p 등 그 외 태그는 strip한 plain text.
      const htmlBody =
        '<p><span data-mention data-id="owner-1">@오너</span> 확인 부탁드립니다</p>';
      prismaMock.contract.findFirst.mockResolvedValue(
        makeContractRow({ references: [{ ccType: "user", refId: "cc-1" }] }),
      );
      prismaMock.user.findUnique.mockResolvedValue(
        makeUser("counsel-1", "inHouseCounsel"),
      );
      const createdRow = {
        id: "comment-1",
        contractId: "contract-1",
        authorId: "counsel-1",
        role: "inHouseCounsel",
        body: htmlBody,
        createdAt: new Date("2026-06-22T01:00:00.000Z"),
        updatedAt: new Date("2026-06-22T01:00:00.000Z"),
        deletedAt: null,
        author: { name: "이법무" },
        mentions: [{ userId: "owner-1", user: { id: "owner-1", name: "오너" } }],
      };
      prismaMock.comment.create.mockResolvedValue(createdRow);
      prismaMock.comment.findUniqueOrThrow.mockResolvedValue(createdRow);
      prismaMock.commentMention.createMany.mockResolvedValue({ count: 1 });
      prismaMock.$transaction.mockImplementation(
        (cb: (tx: typeof prismaMock) => unknown) => cb(prismaMock),
      );

      await service.create({
        contractId: "contract-1",
        body: htmlBody,
        viewerId: "counsel-1",
        mentions: ["owner-1"],
      });

      const items = notificationMock.createMany.mock.calls[0][0] as Array<{
        detail: { preview: string };
      }>;
      // 멘션 라벨 보존 + p 태그 strip → "@오너 확인 부탁드립니다".
      expect(items[0].detail.preview).toBe("@오너 확인 부탁드립니다");
    });

    it("비관련자 멘션이 섞이면 400, comment 생성·멘션 저장 없음", async () => {
      prismaMock.contract.findFirst.mockResolvedValue(makeContractRow());
      prismaMock.user.findUnique.mockResolvedValue(
        makeUser("counsel-1", "inHouseCounsel"),
      );

      await expect(
        service.create({
          contractId: "contract-1",
          body: "엉뚱 멘션",
          viewerId: "counsel-1",
          mentions: ["owner-1", "stranger-99"],
        }),
      ).rejects.toBeInstanceOf(RpcException);

      expect(prismaMock.comment.create).not.toHaveBeenCalled();
      expect(prismaMock.commentMention.createMany).not.toHaveBeenCalled();
    });
  });

  describe("update", () => {
    const mentionRow = (over: Record<string, unknown> = {}) => ({
      id: "comment-1",
      contractId: "contract-1",
      authorId: "counsel-1",
      role: "inHouseCounsel",
      body: "원본",
      createdAt: new Date("2026-06-22T01:00:00.000Z"),
      updatedAt: new Date("2026-06-22T01:00:00.000Z"),
      deletedAt: null,
      ...over,
    });

    const updatedReloaded = {
      id: "comment-1",
      contractId: "contract-1",
      authorId: "counsel-1",
      role: "inHouseCounsel",
      body: "수정된 본문",
      createdAt: new Date("2026-06-22T01:00:00.000Z"),
      updatedAt: new Date("2026-06-22T03:00:00.000Z"),
      deletedAt: null,
      author: { name: "이법무" },
      mentions: [{ userId: "owner-1", user: { id: "owner-1", name: "오너" } }],
    };

    it("본인(authorId===viewer)이면 body·mentions 전체 교체 + updatedAt 갱신 + audit update", async () => {
      prismaMock.contract.findFirst.mockResolvedValue(makeContractRow());
      prismaMock.user.findUnique.mockResolvedValue(
        makeUser("counsel-1", "inHouseCounsel"),
      );
      prismaMock.comment.findFirst.mockResolvedValue(mentionRow());
      prismaMock.comment.findUniqueOrThrow.mockResolvedValue(updatedReloaded);
      prismaMock.commentMention.deleteMany.mockResolvedValue({ count: 0 });
      prismaMock.commentMention.createMany.mockResolvedValue({ count: 1 });
      prismaMock.$transaction.mockImplementation(
        (cb: (tx: typeof prismaMock) => unknown) => cb(prismaMock),
      );

      const result = await service.update({
        contractId: "contract-1",
        commentId: "comment-1",
        body: "수정된 본문",
        viewerId: "counsel-1",
        mentions: ["owner-1"],
      });

      expect(prismaMock.comment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "comment-1" },
          data: { body: "수정된 본문" },
        }),
      );
      // 멘션 전체 교체: deleteMany 후 createMany.
      expect(prismaMock.commentMention.deleteMany).toHaveBeenCalledWith({
        where: { commentId: "comment-1" },
      });
      expect(prismaMock.commentMention.createMany).toHaveBeenCalled();
      expect(auditMock.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: "update", targetType: "Comment" }),
      );
      expect(result.comment.body).toBe("수정된 본문");
      // updatedAt > createdAt → 프론트 "(수정됨)" 판정 근거.
      expect(result.comment.updatedAt).toBe("2026-06-22T03:00:00.000Z");
      expect(result.comment.updatedAt > result.comment.createdAt).toBe(true);
    });

    it("update diff: 기존 멘션(prevSet)은 재알림 안 하고 새로 추가된 멘션만 알림한다", async () => {
      prismaMock.contract.findFirst.mockResolvedValue(
        makeContractRow({ references: [{ ccType: "user", refId: "cc-1" }] }),
      );
      prismaMock.user.findUnique.mockResolvedValue(
        makeUser("counsel-1", "inHouseCounsel"),
      );
      prismaMock.comment.findFirst.mockResolvedValue(mentionRow());
      prismaMock.comment.findUniqueOrThrow.mockResolvedValue(updatedReloaded);
      prismaMock.commentMention.deleteMany.mockResolvedValue({ count: 1 });
      prismaMock.commentMention.createMany.mockResolvedValue({ count: 3 });
      // prevSet: 기존 멘션 = owner-1 (재알림 대상 아님).
      prismaMock.commentMention.findMany.mockResolvedValue([
        { userId: "owner-1" },
      ]);
      prismaMock.$transaction.mockImplementation(
        (cb: (tx: typeof prismaMock) => unknown) => cb(prismaMock),
      );

      await service.update({
        contractId: "contract-1",
        commentId: "comment-1",
        body: "수정된 본문",
        viewerId: "counsel-1",
        // 기존 owner-1(prevSet, 재알림 안 함) + 신규 cc-1(알림).
        mentions: ["owner-1", "cc-1"],
      });

      // prevSet 조회가 같은 tx 에서 일어났는지 확인.
      expect(prismaMock.commentMention.findMany).toHaveBeenCalledWith({
        where: { commentId: "comment-1" },
        select: { userId: true },
      });
      // 알림은 신규 추가분(cc-1)만 — owner-1(기존 prevSet)은 재알림 안 함.
      expect(notificationMock.createMany).toHaveBeenCalledTimes(1);
      const items = notificationMock.createMany.mock.calls[0][0] as Array<{
        recipientId: string;
      }>;
      expect(items.map((i) => i.recipientId)).toEqual(["cc-1"]);
    });

    it("타인 코멘트 수정은 403, update/감사 없음", async () => {
      prismaMock.contract.findFirst.mockResolvedValue(makeContractRow());
      prismaMock.user.findUnique.mockResolvedValue(
        makeUser("owner-1", "outsideCounsel"),
      );
      // 코멘트 작성자는 counsel-1, viewer 는 owner-1.
      prismaMock.comment.findFirst.mockResolvedValue(mentionRow());

      await expect(
        service.update({
          contractId: "contract-1",
          commentId: "comment-1",
          body: "남의 글 수정",
          viewerId: "owner-1",
        }),
      ).rejects.toBeInstanceOf(RpcException);

      expect(prismaMock.comment.update).not.toHaveBeenCalled();
      expect(auditMock.record).not.toHaveBeenCalled();
    });

    it("삭제된 코멘트 수정은 400", async () => {
      prismaMock.contract.findFirst.mockResolvedValue(makeContractRow());
      prismaMock.user.findUnique.mockResolvedValue(
        makeUser("counsel-1", "inHouseCounsel"),
      );
      prismaMock.comment.findFirst.mockResolvedValue(
        mentionRow({ deletedAt: new Date("2026-06-22T02:00:00.000Z") }),
      );

      await expect(
        service.update({
          contractId: "contract-1",
          commentId: "comment-1",
          body: "삭제분 수정 시도",
          viewerId: "counsel-1",
        }),
      ).rejects.toBeInstanceOf(RpcException);
      expect(prismaMock.comment.update).not.toHaveBeenCalled();
    });

    it("빈 body(공백만) 수정은 400 — 계약 조회 전 거부", async () => {
      await expect(
        service.update({
          contractId: "contract-1",
          commentId: "comment-1",
          body: "   ",
          viewerId: "counsel-1",
        }),
      ).rejects.toBeInstanceOf(RpcException);
      expect(prismaMock.contract.findFirst).not.toHaveBeenCalled();
    });
  });

  // 멘션 이메일 발송(best-effort). 인앱 알림과 독립 — emailNotify=true 수신자에게만,
  // 자기멘션 제외, update 는 신규 추가분(addedUserIds)만. 이메일/조회 실패해도 코멘트는 성공.
  describe("mention email", () => {
    // actor(viewer) 이름 조회 + 수신자 emailNotify 분기를 함께 모킹하기 위한 헬퍼.
    // user.findUnique 는 viewer 조회(authz)와 actor 이름 조회 두 군데서 쓰이므로 id 로 분기한다.
    const stubUserFindUnique = (viewer: {
      id: string;
      role: string;
      departmentId?: string | null;
    }) => {
      prismaMock.user.findUnique.mockImplementation(
        (args: { where: { id: string }; select?: unknown }) => {
          // actorName 조회(select: { name })
          if (args.select) {
            return Promise.resolve({ name: `${args.where.id}-name` });
          }
          // viewer 조회(authz)
          if (args.where.id === viewer.id) {
            return Promise.resolve({
              id: viewer.id,
              role: viewer.role,
              departmentId: viewer.departmentId ?? "dept-1",
              name: `${viewer.id}-name`,
            });
          }
          return Promise.resolve(null);
        },
      );
    };

    const createdMentionRow = {
      id: "comment-1",
      contractId: "contract-1",
      authorId: "requester-1",
      role: "general",
      body: "멘션 포함 의견",
      createdAt: new Date("2026-06-22T01:00:00.000Z"),
      updatedAt: new Date("2026-06-22T01:00:00.000Z"),
      deletedAt: null,
      author: { name: "요청자" },
      mentions: [
        { userId: "owner-1", user: { id: "owner-1", name: "오너" } },
        { userId: "cc-1", user: { id: "cc-1", name: "참조자" } },
      ],
    };

    it("create: emailNotify=true 수신자에게만 sendMentionEmail 호출 — false·자기멘션은 스킵", async () => {
      prismaMock.contract.findFirst.mockResolvedValue(
        makeContractRow({ references: [{ ccType: "user", refId: "cc-1" }] }),
      );
      stubUserFindUnique({ id: "requester-1", role: "general" });
      // owner-1: 수신 거부(false) → 스킵, cc-1: 수신(true) → 발송.
      prismaMock.user.findMany.mockResolvedValue([
        { id: "owner-1", email: "owner@law.ai", name: "오너", emailNotify: false },
        { id: "cc-1", email: "cc@law.ai", name: "참조자", emailNotify: true },
      ]);
      prismaMock.comment.create.mockResolvedValue(createdMentionRow);
      prismaMock.comment.findUniqueOrThrow.mockResolvedValue(createdMentionRow);
      prismaMock.commentMention.createMany.mockResolvedValue({ count: 3 });
      prismaMock.$transaction.mockImplementation(
        (cb: (tx: typeof prismaMock) => unknown) => cb(prismaMock),
      );

      await service.create({
        contractId: "contract-1",
        body: "멘션 포함 의견",
        viewerId: "requester-1",
        // requester-1(자기멘션) 포함 → 발송/조회 대상에서 제외.
        mentions: ["owner-1", "cc-1", "requester-1"],
      });

      // 수신자 조회는 자기멘션 제외된 owner-1, cc-1 만.
      expect(prismaMock.user.findMany).toHaveBeenCalledWith({
        where: { id: { in: ["owner-1", "cc-1"] } },
        select: { id: true, email: true, name: true, emailNotify: true },
      });
      // emailNotify=true 인 cc-1 에게만 발송(owner-1 false 스킵, requester-1 자기멘션 제외).
      expect(mailMock.sendMentionEmail).toHaveBeenCalledTimes(1);
      expect(mailMock.sendMentionEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "cc@law.ai",
          recipientName: "참조자",
          actorName: "requester-1-name",
          contractTitle: "비밀유지계약",
          contractId: "contract-1",
          preview: "멘션 포함 의견",
        }),
      );
    });

    it("update: 신규 추가된 멘션(addedUserIds)에게만 sendMentionEmail 호출", async () => {
      prismaMock.contract.findFirst.mockResolvedValue(
        makeContractRow({ references: [{ ccType: "user", refId: "cc-1" }] }),
      );
      stubUserFindUnique({ id: "counsel-1", role: "inHouseCounsel" });
      prismaMock.comment.findFirst.mockResolvedValue({
        id: "comment-1",
        contractId: "contract-1",
        authorId: "counsel-1",
        role: "inHouseCounsel",
        body: "원본",
        createdAt: new Date("2026-06-22T01:00:00.000Z"),
        updatedAt: new Date("2026-06-22T01:00:00.000Z"),
        deletedAt: null,
      });
      prismaMock.comment.findUniqueOrThrow.mockResolvedValue({
        id: "comment-1",
        contractId: "contract-1",
        authorId: "counsel-1",
        role: "inHouseCounsel",
        body: "수정된 본문",
        createdAt: new Date("2026-06-22T01:00:00.000Z"),
        updatedAt: new Date("2026-06-22T03:00:00.000Z"),
        deletedAt: null,
        author: { name: "이법무" },
        mentions: [
          { userId: "owner-1", user: { id: "owner-1", name: "오너" } },
          { userId: "cc-1", user: { id: "cc-1", name: "참조자" } },
        ],
      });
      prismaMock.commentMention.deleteMany.mockResolvedValue({ count: 1 });
      prismaMock.commentMention.createMany.mockResolvedValue({ count: 2 });
      // 기존 멘션 = owner-1 → addedUserIds = cc-1 만.
      prismaMock.commentMention.findMany.mockResolvedValue([
        { userId: "owner-1" },
      ]);
      prismaMock.user.findMany.mockResolvedValue([
        { id: "cc-1", email: "cc@law.ai", name: "참조자", emailNotify: true },
      ]);
      prismaMock.$transaction.mockImplementation(
        (cb: (tx: typeof prismaMock) => unknown) => cb(prismaMock),
      );

      await service.update({
        contractId: "contract-1",
        commentId: "comment-1",
        body: "수정된 본문",
        viewerId: "counsel-1",
        mentions: ["owner-1", "cc-1"],
      });

      // 수신자 조회는 신규 추가분(cc-1)만 — 기존 owner-1 은 재발송 안 함.
      expect(prismaMock.user.findMany).toHaveBeenCalledWith({
        where: { id: { in: ["cc-1"] } },
        select: { id: true, email: true, name: true, emailNotify: true },
      });
      expect(mailMock.sendMentionEmail).toHaveBeenCalledTimes(1);
      expect(mailMock.sendMentionEmail).toHaveBeenCalledWith(
        expect.objectContaining({ to: "cc@law.ai" }),
      );
    });

    it("이메일 발송이 실패(reject)해도 코멘트 create 는 성공하고 인앱 알림도 생성된다", async () => {
      prismaMock.contract.findFirst.mockResolvedValue(
        makeContractRow({ references: [{ ccType: "user", refId: "cc-1" }] }),
      );
      stubUserFindUnique({ id: "requester-1", role: "general" });
      prismaMock.user.findMany.mockResolvedValue([
        { id: "owner-1", email: "owner@law.ai", name: "오너", emailNotify: true },
        { id: "cc-1", email: "cc@law.ai", name: "참조자", emailNotify: true },
      ]);
      // 발송 실패(best-effort) — service 내부 sendMentionEmails 가 swallow 해야 한다.
      mailMock.sendMentionEmail.mockRejectedValue(new Error("mail down"));
      prismaMock.comment.create.mockResolvedValue(createdMentionRow);
      prismaMock.comment.findUniqueOrThrow.mockResolvedValue(createdMentionRow);
      prismaMock.commentMention.createMany.mockResolvedValue({ count: 2 });
      prismaMock.$transaction.mockImplementation(
        (cb: (tx: typeof prismaMock) => unknown) => cb(prismaMock),
      );

      const result = await service.create({
        contractId: "contract-1",
        body: "멘션 포함 의견",
        viewerId: "requester-1",
        mentions: ["owner-1", "cc-1"],
      });

      // 이메일 실패와 무관하게 코멘트 정상 반환 + 인앱 알림 createMany 호출.
      expect(result.comment.id).toBe("comment-1");
      expect(notificationMock.createMany).toHaveBeenCalledTimes(1);
      expect(mailMock.sendMentionEmail).toHaveBeenCalled();
    });

    it("수신자 조회(findMany)가 실패해도 코멘트 create 는 성공한다(best-effort swallow)", async () => {
      prismaMock.contract.findFirst.mockResolvedValue(
        makeContractRow({ references: [{ ccType: "user", refId: "cc-1" }] }),
      );
      stubUserFindUnique({ id: "requester-1", role: "general" });
      // best-effort swallow 경로의 logger.error 가 콘솔을 더럽히지 않게 silence.
      const errorSpy = jest
        .spyOn(Logger.prototype, "error")
        .mockImplementation(() => undefined);
      // 수신자 조회 단계 실패 → sendMentionEmails try/catch 가 swallow.
      prismaMock.user.findMany.mockRejectedValue(new Error("db down"));
      prismaMock.comment.create.mockResolvedValue(createdMentionRow);
      prismaMock.comment.findUniqueOrThrow.mockResolvedValue(createdMentionRow);
      prismaMock.commentMention.createMany.mockResolvedValue({ count: 2 });
      prismaMock.$transaction.mockImplementation(
        (cb: (tx: typeof prismaMock) => unknown) => cb(prismaMock),
      );

      const result = await service.create({
        contractId: "contract-1",
        body: "멘션 포함 의견",
        viewerId: "requester-1",
        mentions: ["owner-1", "cc-1"],
      });

      expect(result.comment.id).toBe("comment-1");
      // 조회 실패로 발송은 못 했지만 코멘트/인앱은 정상.
      expect(mailMock.sendMentionEmail).not.toHaveBeenCalled();
      expect(notificationMock.createMany).toHaveBeenCalledTimes(1);
      // swallow 경로에서 logger.error 가 호출됐는지 확인(가시성).
      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });
  });

  describe("delete", () => {
    const liveRow = {
      id: "comment-1",
      contractId: "contract-1",
      authorId: "counsel-1",
      role: "inHouseCounsel",
      body: "삭제될 의견",
      createdAt: new Date("2026-06-22T01:00:00.000Z"),
      updatedAt: new Date("2026-06-22T01:00:00.000Z"),
      deletedAt: null,
    };

    it("본인이면 소프트 삭제(deletedAt set) + audit delete, placeholder 직렬화", async () => {
      prismaMock.contract.findFirst.mockResolvedValue(makeContractRow());
      prismaMock.user.findUnique.mockResolvedValue(
        makeUser("counsel-1", "inHouseCounsel"),
      );
      prismaMock.comment.findFirst.mockResolvedValue(liveRow);
      prismaMock.comment.update.mockResolvedValue({
        ...liveRow,
        deletedAt: new Date("2026-06-22T04:00:00.000Z"),
        author: { name: "이법무" },
        mentions: [
          { userId: "owner-1", user: { id: "owner-1", name: "오너" } },
        ],
      });

      const dto = await service.delete({
        contractId: "contract-1",
        commentId: "comment-1",
        viewerId: "counsel-1",
      });

      expect(prismaMock.comment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "comment-1" },
          data: { deletedAt: expect.any(Date) },
        }),
      );
      expect(auditMock.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: "delete", targetType: "Comment" }),
      );
      // placeholder: body 빈 문자열·mentions 비움·isDeleted true.
      expect(dto.isDeleted).toBe(true);
      expect(dto.body).toBe("");
      expect(dto.mentions).toEqual([]);
    });

    it("타인 코멘트 삭제는 403, update/감사 없음", async () => {
      prismaMock.contract.findFirst.mockResolvedValue(makeContractRow());
      prismaMock.user.findUnique.mockResolvedValue(
        makeUser("owner-1", "outsideCounsel"),
      );
      prismaMock.comment.findFirst.mockResolvedValue(liveRow);

      await expect(
        service.delete({
          contractId: "contract-1",
          commentId: "comment-1",
          viewerId: "owner-1",
        }),
      ).rejects.toBeInstanceOf(RpcException);

      expect(prismaMock.comment.update).not.toHaveBeenCalled();
      expect(auditMock.record).not.toHaveBeenCalled();
    });
  });

  describe("list", () => {
    it("canView 통과자면 createdAt asc 정렬로 조회하고 CommentDto[] 로 매핑한다", async () => {
      prismaMock.contract.findFirst.mockResolvedValue(makeContractRow());
      prismaMock.user.findUnique.mockResolvedValue(
        makeUser("owner-1", "outsideCounsel"),
      );
      prismaMock.comment.findMany.mockResolvedValue([
        {
          id: "c1",
          contractId: "contract-1",
          authorId: "owner-1",
          role: "outsideCounsel",
          body: "첫 의견",
          createdAt: new Date("2026-06-22T01:00:00.000Z"),
          updatedAt: new Date("2026-06-22T01:00:00.000Z"),
          deletedAt: null,
          author: { name: "박변호" },
          mentions: [],
        },
        {
          id: "c2",
          contractId: "contract-1",
          authorId: "counsel-1",
          role: "inHouseCounsel",
          body: "두번째 의견",
          createdAt: new Date("2026-06-22T02:00:00.000Z"),
          updatedAt: new Date("2026-06-22T02:00:00.000Z"),
          deletedAt: null,
          author: { name: "이법무" },
          mentions: [],
        },
      ]);

      const result = await service.list({
        contractId: "contract-1",
        viewerId: "owner-1",
      });

      expect(prismaMock.comment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { contractId: "contract-1" },
          orderBy: { createdAt: "asc" },
        }),
      );
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: "c1",
        contractId: "contract-1",
        authorId: "owner-1",
        authorName: "박변호",
        role: "outsideCounsel",
        body: "첫 의견",
        mentions: [],
        createdAt: "2026-06-22T01:00:00.000Z",
        updatedAt: "2026-06-22T01:00:00.000Z",
        isDeleted: false,
        isAuthor: true,
      });
      expect(result[1].authorName).toBe("이법무");
      expect(result[1].role).toBe("inHouseCounsel");
    });

    it("삭제 행은 제외하지 않고 placeholder 로, isAuthor/mentions 를 직렬화한다", async () => {
      prismaMock.contract.findFirst.mockResolvedValue(makeContractRow());
      prismaMock.user.findUnique.mockResolvedValue(
        makeUser("owner-1", "outsideCounsel"),
      );
      prismaMock.comment.findMany.mockResolvedValue([
        {
          id: "c1",
          contractId: "contract-1",
          authorId: "owner-1", // viewer 본인 → isAuthor true
          role: "outsideCounsel",
          body: "내 의견(멘션 포함)",
          createdAt: new Date("2026-06-22T01:00:00.000Z"),
          updatedAt: new Date("2026-06-22T01:00:00.000Z"),
          deletedAt: null,
          author: { name: "박변호" },
          mentions: [
            { userId: "counsel-1", user: { id: "counsel-1", name: "이법무" } },
          ],
        },
        {
          id: "c2",
          contractId: "contract-1",
          authorId: "counsel-1", // 타인 → isAuthor false
          role: "inHouseCounsel",
          body: "삭제된 본문(숨겨야 함)",
          createdAt: new Date("2026-06-22T02:00:00.000Z"),
          updatedAt: new Date("2026-06-22T02:30:00.000Z"),
          deletedAt: new Date("2026-06-22T03:00:00.000Z"),
          author: { name: "이법무" },
          mentions: [
            { userId: "owner-1", user: { id: "owner-1", name: "오너" } },
          ],
        },
      ]);

      const result = await service.list({
        contractId: "contract-1",
        viewerId: "owner-1",
      });

      // where 에 deletedAt 필터 없음(삭제분 포함).
      expect(prismaMock.comment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { contractId: "contract-1" } }),
      );
      expect(result).toHaveLength(2);

      // 살아있는 본인 행: isAuthor true, mentions 직렬화.
      expect(result[0].isAuthor).toBe(true);
      expect(result[0].isDeleted).toBe(false);
      expect(result[0].mentions).toEqual([
        { userId: "counsel-1", name: "이법무" },
      ]);

      // 삭제 행: placeholder(body "", mentions []), isDeleted true, isAuthor false.
      expect(result[1].isDeleted).toBe(true);
      expect(result[1].isAuthor).toBe(false);
      expect(result[1].body).toBe("");
      expect(result[1].mentions).toEqual([]);
    });

    it("관련 없는 general 은 403, 조회 없음", async () => {
      prismaMock.contract.findFirst.mockResolvedValue(makeContractRow());
      prismaMock.user.findUnique.mockResolvedValue(
        makeUser("stranger", "general"),
      );

      await expect(
        service.list({ contractId: "contract-1", viewerId: "stranger" }),
      ).rejects.toBeInstanceOf(RpcException);
      expect(prismaMock.comment.findMany).not.toHaveBeenCalled();
    });

    it("계약 미존재면 404", async () => {
      prismaMock.contract.findFirst.mockResolvedValue(null);
      await expect(
        service.list({ contractId: "missing", viewerId: "owner-1" }),
      ).rejects.toBeInstanceOf(RpcException);
    });
  });
});
