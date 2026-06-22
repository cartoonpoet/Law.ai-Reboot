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
    comment: { create: jest.fn(), findMany: jest.fn() },
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
      prismaMock.comment.create.mockResolvedValue({
        id: "comment-1",
        contractId: "contract-1",
        authorId: "counsel-1",
        role: "inHouseCounsel",
        body: "검토 의견입니다",
        createdAt: new Date("2026-06-22T01:00:00.000Z"),
        author: { name: "이법무" },
      });

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
      // DTO 매핑(authorName/role/createdAt ISO).
      expect(dto).toEqual({
        id: "comment-1",
        contractId: "contract-1",
        authorId: "counsel-1",
        authorName: "이법무",
        role: "inHouseCounsel",
        body: "검토 의견입니다",
        createdAt: "2026-06-22T01:00:00.000Z",
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
          author: { name: "박변호" },
        },
        {
          id: "c2",
          contractId: "contract-1",
          authorId: "counsel-1",
          role: "inHouseCounsel",
          body: "두번째 의견",
          createdAt: new Date("2026-06-22T02:00:00.000Z"),
          author: { name: "이법무" },
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
        createdAt: "2026-06-22T01:00:00.000Z",
      });
      expect(result[1].authorName).toBe("이법무");
      expect(result[1].role).toBe("inHouseCounsel");
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
