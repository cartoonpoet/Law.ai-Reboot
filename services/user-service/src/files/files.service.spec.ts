import { Test } from "@nestjs/testing";
import { RpcException } from "@nestjs/microservices";
import { FilesService } from "./files.service";
import { PrismaService } from "../prisma/prisma.service";
import { R2Client } from "./r2.client";
import { AuditService } from "../contracts/contracts.audit";
import { signUploadToken } from "./uploadToken";

/**
 * FilesService 단위 테스트 (R2 mock).
 *
 * - presign: authz canView → URL/uploadToken 발급. R2 disabled 시 503.
 * - 검증: MIME 화이트리스트/size 50MB/sha256 hex/파일명 길이 거절.
 * - confirm: HeadObject 검증 + size 일치 + File row 생성 + checksum=etag.
 * - getDownloadUrl: canView + Comment soft-delete 시 차단.
 * - viewer role 공급원: UserTenant.role(토큰 stale 방지). admin=isSystemAdmin → user.findUnique.
 */

// AWS SDK presigner 는 항상 가짜 URL 반환 — 네트워크 호출 없음.
jest.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: jest.fn().mockResolvedValue("https://r2.example/signed-url"),
}));

describe("FilesService", () => {
  let service: FilesService;

  const prismaMock = {
    contract: { findFirst: jest.fn() },
    user: { findUnique: jest.fn() },
    userTenant: { findFirst: jest.fn() },
    file: {
      count: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
  };

  // R2 enabled mock: client.send 가 HeadObject 응답을 돌려준다.
  const sendMock = jest.fn();
  const r2Enabled: Partial<R2Client> = {
    disabled: false,
    bucket: "test-bucket",
    client: { send: sendMock } as unknown as R2Client["client"],
  };

  const makeContractRow = (over: Record<string, unknown> = {}) => ({
    id: "contract-1",
    title: "비밀유지계약",
    createdById: "creator-1",
    ownerId: "owner-1",
    requesterId: "requester-1",
    status: "legalReview",
    securityLevel: "secure",
    departmentId: "dept-1",
    tenantId: "tenant-1",
    deletedAt: null,
    references: [],
    ...over,
  });

  // 테넌트 컨텍스트 헬퍼.
  const makeCtx = (tenantId = "tenant-1", isSystemAdmin = false) => ({
    tenantId,
    isSystemAdmin,
  });

  // 감사 기록은 best-effort — 검증 시점엔 호출 여부만 보면 됨.
  const auditMock = { record: jest.fn().mockResolvedValue(undefined) };

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.FILE_UPLOAD_SECRET = "test-secret";
    auditMock.record.mockResolvedValue(undefined);
    const moduleRef = await Test.createTestingModule({
      providers: [
        FilesService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: R2Client, useValue: r2Enabled },
        { provide: AuditService, useValue: auditMock },
      ],
    }).compile();
    service = moduleRef.get(FilesService);
  });

  const VALID_SHA = "a".repeat(64);
  const VALID_MIME = "application/pdf";

  describe("presign", () => {
    it("R2 disabled 시 503", async () => {
      const disabled = { disabled: true, client: null, bucket: null };
      const mod = await Test.createTestingModule({
        providers: [
          FilesService,
          { provide: PrismaService, useValue: prismaMock },
          { provide: R2Client, useValue: disabled },
          { provide: AuditService, useValue: auditMock },
        ],
      }).compile();
      const svc = mod.get(FilesService);
      await expect(
        svc.presign({
          contractId: "c1",
          fileName: "a.pdf",
          size: 100,
          mimeType: VALID_MIME,
          sha256: VALID_SHA,
          viewerId: "u1",
          tenantContext: makeCtx(),
        }),
      ).rejects.toBeInstanceOf(RpcException);
    });

    it("canView 통과자(법무팀)는 uploadUrl + uploadToken 발급 — UserTenant.role 공급", async () => {
      prismaMock.contract.findFirst.mockResolvedValue(makeContractRow());
      prismaMock.userTenant.findFirst.mockResolvedValue({
        role: "inHouseCounsel",
        user: { departmentId: "dept-1" },
      });
      const res = await service.presign({
        contractId: "contract-1",
        fileName: "검토.pdf",
        size: 100_000,
        mimeType: VALID_MIME,
        sha256: VALID_SHA,
        viewerId: "counsel-1",
        tenantContext: makeCtx(),
      });
      expect(res.uploadUrl).toBe("https://r2.example/signed-url");
      expect(res.uploadToken).toEqual(expect.any(String));
      expect(res.storageKey).toMatch(/^contracts\/contract-1\//);
      expect(res.expiresIn).toBe(900);
      // user.findUnique 는 호출되지 않아야 함(일반 테넌트 경로는 userTenant 사용).
      expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    });

    it("관련 없는 general 은 403 — UserTenant.role 공급", async () => {
      prismaMock.contract.findFirst.mockResolvedValue(makeContractRow());
      prismaMock.userTenant.findFirst.mockResolvedValue({
        role: "general",
        user: { departmentId: "dept-9" },
      });
      await expect(
        service.presign({
          contractId: "contract-1",
          fileName: "a.pdf",
          size: 100,
          mimeType: VALID_MIME,
          sha256: VALID_SHA,
          viewerId: "stranger",
          tenantContext: makeCtx(),
        }),
      ).rejects.toBeInstanceOf(RpcException);
    });

    it("타 테넌트 멤버(userTenant null) → viewer null → 403", async () => {
      prismaMock.contract.findFirst.mockResolvedValue(makeContractRow());
      // 해당 tenantId 에 UserTenant 없음 → loadViewer 가 null 반환.
      prismaMock.userTenant.findFirst.mockResolvedValue(null);
      await expect(
        service.presign({
          contractId: "contract-1",
          fileName: "a.pdf",
          size: 100,
          mimeType: VALID_MIME,
          sha256: VALID_SHA,
          viewerId: "outsider",
          tenantContext: makeCtx("tenant-other"),
        }),
      ).rejects.toBeInstanceOf(RpcException);
    });

    it("isSystemAdmin=true 면 user.findUnique 경로 — inHouseCounsel 로 평가", async () => {
      prismaMock.contract.findFirst.mockResolvedValue(makeContractRow());
      prismaMock.user.findUnique.mockResolvedValue({
        id: "admin-1",
        departmentId: null,
      });
      const res = await service.presign({
        contractId: "contract-1",
        fileName: "admin.pdf",
        size: 100_000,
        mimeType: VALID_MIME,
        sha256: VALID_SHA,
        viewerId: "admin-1",
        tenantContext: makeCtx("tenant-1", true),
      });
      expect(res.uploadUrl).toBe("https://r2.example/signed-url");
      // userTenant.findFirst 는 호출되지 않아야 함(admin 경로).
      expect(prismaMock.userTenant.findFirst).not.toHaveBeenCalled();
    });

    it("허용되지 않은 MIME 은 400", async () => {
      prismaMock.contract.findFirst.mockResolvedValue(makeContractRow());
      prismaMock.userTenant.findFirst.mockResolvedValue({
        role: "inHouseCounsel",
        user: { departmentId: "dept-1" },
      });
      await expect(
        service.presign({
          contractId: "contract-1",
          fileName: "a.exe",
          size: 100,
          mimeType: "application/x-msdownload",
          sha256: VALID_SHA,
          viewerId: "counsel-1",
          tenantContext: makeCtx(),
        }),
      ).rejects.toBeInstanceOf(RpcException);
    });

    it("50MB 초과 size 는 400", async () => {
      prismaMock.contract.findFirst.mockResolvedValue(makeContractRow());
      prismaMock.userTenant.findFirst.mockResolvedValue({
        role: "inHouseCounsel",
        user: { departmentId: "dept-1" },
      });
      await expect(
        service.presign({
          contractId: "contract-1",
          fileName: "a.pdf",
          size: 60 * 1024 * 1024,
          mimeType: VALID_MIME,
          sha256: VALID_SHA,
          viewerId: "counsel-1",
          tenantContext: makeCtx(),
        }),
      ).rejects.toBeInstanceOf(RpcException);
    });

    it("commentId 지정 시 코멘트당 5개 초과면 400", async () => {
      prismaMock.contract.findFirst.mockResolvedValue(makeContractRow());
      prismaMock.userTenant.findFirst.mockResolvedValue({
        role: "inHouseCounsel",
        user: { departmentId: "dept-1" },
      });
      prismaMock.file.count.mockResolvedValue(5);
      await expect(
        service.presign({
          contractId: "contract-1",
          commentId: "comment-1",
          fileName: "a.pdf",
          size: 100,
          mimeType: VALID_MIME,
          sha256: VALID_SHA,
          viewerId: "counsel-1",
          tenantContext: makeCtx(),
        }),
      ).rejects.toBeInstanceOf(RpcException);
    });
  });

  describe("confirm", () => {
    it("토큰 sub != viewerId 면 403", async () => {
      const token = signUploadToken(
        {
          sub: "other-user",
          contractId: "contract-1",
          commentId: null,
          role: "attach",
          storageKey: "contracts/contract-1/uuid/a.pdf",
          fileName: "a.pdf",
          sha256: VALID_SHA,
          size: 100,
          mimeType: VALID_MIME,
        },
        900,
      );
      await expect(
        service.confirm({
          uploadToken: token,
          etag: "abc",
          viewerId: "counsel-1",
          tenantContext: makeCtx(),
        }),
      ).rejects.toBeInstanceOf(RpcException);
    });

    it("HeadObject Size 불일치 시 400", async () => {
      const token = signUploadToken(
        {
          sub: "counsel-1",
          contractId: "contract-1",
          commentId: null,
          role: "attach",
          storageKey: "contracts/contract-1/uuid/a.pdf",
          fileName: "a.pdf",
          sha256: VALID_SHA,
          size: 100,
          mimeType: VALID_MIME,
        },
        900,
      );
      sendMock.mockResolvedValueOnce({ ContentLength: 50 });
      await expect(
        service.confirm({
          uploadToken: token,
          etag: "abc",
          viewerId: "counsel-1",
          tenantContext: makeCtx(),
        }),
      ).rejects.toBeInstanceOf(RpcException);
    });

    it("성공 시 File row 생성 + checksum=etag, FileAttachmentDto 반환", async () => {
      const token = signUploadToken(
        {
          sub: "counsel-1",
          contractId: "contract-1",
          commentId: null,
          role: "attach",
          storageKey: "contracts/contract-1/uuid/a.pdf",
          fileName: "a.pdf",
          sha256: VALID_SHA,
          size: 100,
          mimeType: VALID_MIME,
        },
        900,
      );
      sendMock.mockResolvedValueOnce({ ContentLength: 100 });
      prismaMock.file.findFirst.mockResolvedValue({ sortOrder: 2 });
      prismaMock.file.create.mockResolvedValue({
        id: "file-1",
        name: "a.pdf",
        size: 100,
        mimeType: VALID_MIME,
        checksum: "etag-xyz",
        createdAt: new Date("2026-06-27T00:00:00Z"),
      });

      const dto = await service.confirm({
        uploadToken: token,
        etag: "etag-xyz",
        viewerId: "counsel-1",
        tenantContext: makeCtx(),
      });
      expect(prismaMock.file.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          contractId: "contract-1",
          tenantId: "tenant-1",
          role: "attach",
          checksum: "etag-xyz",
          sortOrder: 3,
        }),
      });
      expect(dto.id).toBe("file-1");
      expect(dto.sha256).toBe("etag-xyz");
    });
  });

  describe("getDownloadUrl", () => {
    it("canView 통과 + 코멘트 미삭제면 presigned GET URL 반환 — UserTenant.role 공급", async () => {
      prismaMock.file.findFirst.mockResolvedValue({
        id: "file-1",
        name: "a.pdf",
        storageKey: "contracts/contract-1/uuid/a.pdf",
        contract: { ...makeContractRow(), references: [] },
        comment: null,
      });
      prismaMock.userTenant.findFirst.mockResolvedValue({
        role: "inHouseCounsel",
        user: { departmentId: "dept-1" },
      });
      const res = await service.getDownloadUrl({
        fileId: "file-1",
        viewerId: "counsel-1",
        tenantContext: makeCtx(),
      });
      expect(res.url).toBe("https://r2.example/signed-url");
      expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    });

    it("코멘트 soft-deleted 첨부는 404", async () => {
      prismaMock.file.findFirst.mockResolvedValue({
        id: "file-1",
        name: "a.pdf",
        storageKey: "contracts/contract-1/uuid/a.pdf",
        contract: { ...makeContractRow(), references: [] },
        comment: { deletedAt: new Date() },
      });
      prismaMock.userTenant.findFirst.mockResolvedValue({
        role: "inHouseCounsel",
        user: { departmentId: "dept-1" },
      });
      await expect(
        service.getDownloadUrl({ fileId: "file-1", viewerId: "counsel-1", tenantContext: makeCtx() }),
      ).rejects.toBeInstanceOf(RpcException);
    });

    it("canView 미통과 general stranger 는 403 — UserTenant.role 공급", async () => {
      prismaMock.file.findFirst.mockResolvedValue({
        id: "file-1",
        name: "a.pdf",
        storageKey: "contracts/contract-1/uuid/a.pdf",
        contract: { ...makeContractRow(), references: [] },
        comment: null,
      });
      prismaMock.userTenant.findFirst.mockResolvedValue({
        role: "general",
        user: { departmentId: "dept-9" },
      });
      await expect(
        service.getDownloadUrl({ fileId: "file-1", viewerId: "stranger", tenantContext: makeCtx() }),
      ).rejects.toBeInstanceOf(RpcException);
    });

    it("타 테넌트 멤버(userTenant null) → viewer null → 403", async () => {
      prismaMock.file.findFirst.mockResolvedValue({
        id: "file-1",
        name: "a.pdf",
        storageKey: "contracts/contract-1/uuid/a.pdf",
        contract: { ...makeContractRow(), references: [] },
        comment: null,
      });
      // 해당 tenantId 에 UserTenant 없음 → loadViewer 가 null 반환.
      prismaMock.userTenant.findFirst.mockResolvedValue(null);
      await expect(
        service.getDownloadUrl({
          fileId: "file-1",
          viewerId: "outsider",
          tenantContext: makeCtx("tenant-other"),
        }),
      ).rejects.toBeInstanceOf(RpcException);
    });

    it("타 테넌트 파일 다운로드 404 — File.tenantId 직접 검증(tenantScope)", async () => {
      // 타 테넌트(tenant-2) 컨텍스트. File.tenantId 가 tenant-1 이라 findFirst 가 null 을 반환한다.
      prismaMock.file.findFirst.mockResolvedValue(null);

      await expect(
        service.getDownloadUrl({
          fileId: "file-1",
          viewerId: "counsel-1",
          tenantContext: { tenantId: "tenant-2", isSystemAdmin: false },
        }),
      ).rejects.toBeInstanceOf(RpcException);

      // tenantScope 가 where 에 포함됐는지 — findFirst 에 tenantId: 'tenant-2' 전달.
      expect(prismaMock.file.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: "tenant-2" }),
        }),
      );
    });
  });

  describe("auditCompareReport", () => {
    it("성공 시 audit.record 에 tenantId 가 기록된다 — UserTenant.role 공급", async () => {
      prismaMock.contract.findFirst.mockResolvedValue(makeContractRow());
      prismaMock.userTenant.findFirst.mockResolvedValue({
        role: "inHouseCounsel",
        user: { departmentId: "dept-1" },
      });
      prismaMock.file.findMany.mockResolvedValue([
        { id: "file-a" },
        { id: "file-b" },
      ]);

      const result = await service.auditCompareReport({
        contractId: "contract-1",
        fileAId: "file-a",
        fileAName: "v1.pdf",
        fileBId: "file-b",
        fileBName: "v2.pdf",
        addedLines: 10,
        removedLines: 5,
        viewerId: "counsel-1",
        tenantContext: makeCtx(),
      });

      expect(result).toEqual({ ok: true });
      expect(auditMock.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "compare_report_download",
          targetType: "Contract",
          targetId: "contract-1",
          actorId: "counsel-1",
          tenantId: "tenant-1",
        }),
      );
      expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    });

    it("타 테넌트 멤버(userTenant null) → viewer null → 403", async () => {
      prismaMock.contract.findFirst.mockResolvedValue(makeContractRow());
      prismaMock.userTenant.findFirst.mockResolvedValue(null);
      prismaMock.file.findMany.mockResolvedValue([{ id: "file-a" }, { id: "file-b" }]);

      await expect(
        service.auditCompareReport({
          contractId: "contract-1",
          fileAId: "file-a",
          fileAName: "v1.pdf",
          fileBId: "file-b",
          fileBName: "v2.pdf",
          addedLines: 10,
          removedLines: 5,
          viewerId: "outsider",
          tenantContext: makeCtx("tenant-other"),
        }),
      ).rejects.toBeInstanceOf(RpcException);
    });
  });
});
