import { Test } from "@nestjs/testing";
import { RpcException } from "@nestjs/microservices";
import { CommentsService } from "./comments.service";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../contracts/contracts.audit";

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
    user: { findUnique: jest.fn() },
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
    },
    // $transaction(cb) 형태(우리 service 가 사용하는 콜백 시그니처)만 모킹.
    $transaction: jest.fn(),
  };
  const auditMock = { record: jest.fn() };

  // 권한 평가용 계약 행(references 포함). 케이스별 owner/creator 등 덮어쓰기.
  const makeContractRow = (over: Record<string, unknown> = {}) => ({
    id: "contract-1",
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
    const moduleRef = await Test.createTestingModule({
      providers: [
        CommentsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: AuditService, useValue: auditMock },
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

      const dto = await service.create({
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
      // DTO 매핑(authorName/role/createdAt ISO + 멘션/수정/삭제/본인 필드).
      expect(dto).toEqual({
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

      const dto = await service.create({
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
      expect(dto.mentions).toEqual([
        { userId: "owner-1", name: "오너" },
        { userId: "cc-1", name: "참조자" },
      ]);
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

      const dto = await service.update({
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
      expect(dto.body).toBe("수정된 본문");
      // updatedAt > createdAt → 프론트 "(수정됨)" 판정 근거.
      expect(dto.updatedAt).toBe("2026-06-22T03:00:00.000Z");
      expect(dto.updatedAt > dto.createdAt).toBe(true);
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
