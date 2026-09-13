import { Injectable, Logger } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import {
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  MAX_FILES_PER_COMMENT,
  type AllowedMimeType,
  type AuditCompareReportRequest,
  type ConfirmUploadRequest,
  type FileAttachmentDto,
  type GetDownloadUrlRequest,
  type GetDownloadUrlResponse,
  type PresignUploadRequest,
  type PresignUploadResponse,
  type TenantContext,
} from "@lawai/contracts";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../contracts/contracts.audit";
import { evaluate } from "../contracts/contracts.authz";
import type {
  AuthzContract,
  AuthzViewer,
} from "../contracts/contracts.authz";
import { tenantScope, resolveTenantId } from "../common/tenant-scope";
import { R2Client } from "./r2.client";
import { signUploadToken, verifyUploadToken } from "./uploadToken";

const PRESIGN_TTL_SEC = 900;

const contractAuthzInclude = {
  references: true,
} satisfies Prisma.ContractInclude;
type ContractForAuthz = Prisma.ContractGetPayload<{
  include: typeof contractAuthzInclude;
}>;

const extractCcUserIds = (
  refs: { ccType: string; refId: string }[],
): string[] => refs.filter((r) => r.ccType === "user").map((r) => r.refId);

const toAuthzContract = (row: ContractForAuthz): AuthzContract => ({
  createdById: row.createdById,
  ownerId: row.ownerId,
  requesterId: row.requesterId,
  ccUserIds: extractCcUserIds(row.references),
  status: row.status,
  securityLevel: row.securityLevel,
  departmentId: row.departmentId,
});

// ASCII 안전 파일명 sanitize — storageKey 에 들어가는 부분(Cloudflare R2 key 는 ASCII 권장).
// 원본 파일명은 File.name 에 보존하므로 다운로드 시 ResponseContentDisposition 으로 그대로 노출.
const sanitizeFileName = (name: string): string => {
  const trimmed = name.trim().slice(0, 200);
  const safe = trimmed.replace(/[^a-zA-Z0-9._-]/g, "_");
  return safe || "file";
};

const getExtension = (name: string): string => {
  const idx = name.lastIndexOf(".");
  return idx === -1 ? "" : name.slice(idx).toLowerCase();
};

interface FileForDto {
  id: string;
  name: string;
  size: number | null;
  mimeType: string | null;
  checksum: string | null;
  createdAt: Date;
}

export const toFileAttachmentDto = (row: FileForDto): FileAttachmentDto => ({
  id: row.id,
  name: row.name,
  size: row.size ?? 0,
  mimeType: row.mimeType ?? "application/octet-stream",
  sha256: row.checksum,
  createdAt: row.createdAt.toISOString(),
});

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly r2: R2Client,
    private readonly audit: AuditService,
  ) {}

  // viewer(role/departmentId) 조회. viewerId 없거나 사용자 미존재면 null(evaluate 안전 기본).
  // role 공급원: 활성 테넌트의 UserTenant.role(토큰 stale 방지). admin 은 inHouseCounsel 로 매핑.
  private async loadViewer(
    viewerId: string | undefined,
    ctx: TenantContext,
  ): Promise<AuthzViewer | null> {
    if (!viewerId) return null;
    if (ctx.isSystemAdmin) {
      // 시스템 admin 은 전권 — authz 상 전체 view 동급(inHouseCounsel 역할로 평가).
      const u = await this.prisma.user.findUnique({ where: { id: viewerId } });
      return u ? { id: u.id, role: "inHouseCounsel", departmentId: u.departmentId } : null;
    }
    const m = await this.prisma.userTenant.findFirst({
      where: { userId: viewerId, tenantId: ctx.tenantId },
      include: { user: { select: { departmentId: true } } },
    });
    return m ? { id: viewerId, role: m.role, departmentId: m.user.departmentId } : null;
  }

  // tenantScope 를 where 에 합쳐 타 테넌트 계약 ID 위조를 차단한다.
  private async loadContract(
    contractId: string,
    ctx: import("@lawai/contracts").TenantContext,
  ): Promise<ContractForAuthz> {
    const row = await this.prisma.contract.findFirst({
      where: { id: contractId, deletedAt: null, ...tenantScope(ctx) },
      include: contractAuthzInclude,
    });
    if (!row) {
      throw new RpcException({
        status: 404,
        message: "계약을 찾을 수 없습니다",
      });
    }
    return row;
  }

  private async authorizeCanView(
    contract: ContractForAuthz,
    viewerId: string | undefined,
    ctx: TenantContext,
  ): Promise<AuthzViewer> {
    const viewer = await this.loadViewer(viewerId, ctx);
    const authz = evaluate(viewer, toAuthzContract(contract));
    if (!viewer || !authz.canView) {
      throw new RpcException({
        status: 403,
        message: "파일 업로드 권한이 없습니다",
      });
    }
    return viewer;
  }

  // role:"signed" 업로드는 체결 완료 등록 경로(미배정·unassigned·생성자 본인)에서만 허용한다.
  // 그 외엔 참조자 등 canView 만 가진 사용자가 남의 계약에 서명본을 끼워 넣어(서명본 버킷이
  // 생기고 편집 폼이 서명 모드로 뒤집히며 PATCH 가드 때문에 지울 수도 없게 됨) 오염시킬 수 있다.
  // 결재 경로(completeSigning)는 attach 로 올린 뒤 서버에서 승격하므로 이 제한과 무관하다.
  private assertSignedUploadAllowed(
    contract: ContractForAuthz,
    viewerId: string,
    commentId: string | null | undefined,
  ): void {
    const isDirectRegistration =
      !commentId &&
      contract.status === "unassigned" &&
      contract.ownerId === null &&
      contract.createdById === viewerId;
    if (!isDirectRegistration) {
      throw new RpcException({
        status: 403,
        message: "서명본은 체결 완료 등록 중인 본인 계약에만 업로드할 수 있습니다",
      });
    }
  }

  private ensureEnabled(): void {
    if (this.r2.disabled || !this.r2.client || !this.r2.bucket) {
      throw new RpcException({
        status: 503,
        message: "파일 업로드가 구성되지 않았습니다 (R2 미설정)",
      });
    }
  }

  private validateFileMeta(args: {
    fileName: string;
    size: number;
    mimeType: string;
    sha256: string;
  }): void {
    const { fileName, size, mimeType, sha256 } = args;
    if (!fileName || fileName.length > 255) {
      throw new RpcException({
        status: 400,
        message: "파일명이 유효하지 않습니다",
      });
    }
    if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType)) {
      throw new RpcException({
        status: 400,
        message: "허용되지 않은 파일 형식입니다",
      });
    }
    const ext = getExtension(fileName);
    if (!(ALLOWED_EXTENSIONS as readonly string[]).includes(ext)) {
      throw new RpcException({
        status: 400,
        message: "허용되지 않은 파일 확장자입니다",
      });
    }
    if (!Number.isInteger(size) || size <= 0 || size > MAX_FILE_SIZE_BYTES) {
      throw new RpcException({
        status: 400,
        message: "파일 크기가 50MB 를 초과하거나 유효하지 않습니다",
      });
    }
    if (!/^[0-9a-f]{64}$/.test(sha256)) {
      throw new RpcException({
        status: 400,
        message: "유효하지 않은 sha256 해시입니다",
      });
    }
  }

  async presign(req: PresignUploadRequest): Promise<PresignUploadResponse> {
    const ctx = req.tenantContext!;
    this.ensureEnabled();
    const contract = await this.loadContract(req.contractId, ctx);
    const viewer = await this.authorizeCanView(contract, req.viewerId, ctx);
    if (req.role === "signed") {
      this.assertSignedUploadAllowed(contract, viewer.id, req.commentId);
    }
    this.validateFileMeta({
      fileName: req.fileName,
      size: req.size,
      mimeType: req.mimeType,
      sha256: req.sha256,
    });

    // commentId 가 명시되면 이미 부착된 첨부 카운트로 코멘트당 5개 제한 재검증.
    if (req.commentId) {
      const count = await this.prisma.file.count({
        where: { commentId: req.commentId },
      });
      if (count >= MAX_FILES_PER_COMMENT) {
        throw new RpcException({
          status: 400,
          message: `코멘트당 첨부는 최대 ${MAX_FILES_PER_COMMENT}개입니다`,
        });
      }
    }

    const safeName = sanitizeFileName(req.fileName);
    const storageKey = `contracts/${req.contractId}/${randomUUID()}/${safeName}`;

    // R2 PutObject presigned URL — Content-Type 만 강제(서명 일관성). 클라가 동일 ContentType 으로 PUT.
    const command = new PutObjectCommand({
      Bucket: this.r2.bucket as string,
      Key: storageKey,
      ContentType: req.mimeType,
    });
    const uploadUrl = await getSignedUrl(this.r2.client as never, command, {
      expiresIn: PRESIGN_TTL_SEC,
    });

    const uploadToken = signUploadToken(
      {
        sub: viewer.id,
        contractId: req.contractId,
        commentId: req.commentId ?? null,
        // 기본 attach — 코멘트 첨부 흐름(role 미지정) 호환. 계약 본 파일은 명시 필요.
        role: req.role ?? "attach",
        storageKey,
        fileName: req.fileName,
        sha256: req.sha256,
        size: req.size,
        mimeType: req.mimeType,
      },
      PRESIGN_TTL_SEC,
    );

    return {
      uploadUrl,
      uploadToken,
      storageKey,
      expiresIn: PRESIGN_TTL_SEC,
    };
  }

  async confirm(req: ConfirmUploadRequest): Promise<FileAttachmentDto> {
    const ctx = req.tenantContext!;
    this.ensureEnabled();
    let claims;
    try {
      claims = verifyUploadToken(req.uploadToken);
    } catch {
      throw new RpcException({
        status: 401,
        message: "업로드 토큰이 만료되었거나 유효하지 않습니다",
      });
    }
    if (!req.viewerId || claims.sub !== req.viewerId) {
      throw new RpcException({
        status: 403,
        message: "업로드 토큰 소유자가 아닙니다",
      });
    }

    // 토큰의 role 은 presign 시점 판단이다. 토큰 유효기간(15분) 사이에 계약이 배정·전이됐을 수
    // 있으므로 signed 는 File 행을 만들기 직전에 현재 계약 상태로 다시 확인한다.
    if (claims.role === "signed") {
      const contract = await this.loadContract(claims.contractId, ctx);
      this.assertSignedUploadAllowed(contract, claims.sub, claims.commentId);
    }

    // 객체 존재 + Size 일치 확인(클라이언트가 보낸 size 와 ±0).
    const head = await (this.r2.client as never as {
      send: (cmd: HeadObjectCommand) => Promise<{ ContentLength?: number }>;
    }).send(
      new HeadObjectCommand({
        Bucket: this.r2.bucket as string,
        Key: claims.storageKey,
      }),
    );
    if (head.ContentLength !== claims.size) {
      throw new RpcException({
        status: 400,
        message: "업로드된 파일 크기가 일치하지 않습니다",
      });
    }

    // sortOrder = 동일 contract 의 max+1(코멘트 기준이 아니라 contract 기준 — 기존 패턴).
    const last = await this.prisma.file.findFirst({
      where: { contractId: claims.contractId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    const sortOrder = (last?.sortOrder ?? 0) + 1;

    const created = await this.prisma.file.create({
      data: {
        contractId: claims.contractId,
        commentId: claims.commentId ?? null,
        tenantId: resolveTenantId(ctx),
        role: claims.role,
        name: claims.fileName,
        mimeType: claims.mimeType as AllowedMimeType,
        size: claims.size,
        storageKey: claims.storageKey,
        checksum: req.etag,
        sortOrder,
      },
    });

    return toFileAttachmentDto(created);
  }

  async getDownloadUrl(
    req: GetDownloadUrlRequest,
  ): Promise<GetDownloadUrlResponse> {
    const ctx = req.tenantContext!;
    this.ensureEnabled();
    // File.tenantId 직접 검증: tenantScope 를 where 에 합쳐 타 테넌트 파일 ID 위조를 차단한다.
    const file = await this.prisma.file.findFirst({
      where: { id: req.fileId, ...tenantScope(ctx) },
      include: {
        contract: { include: { references: true } },
        comment: true,
      },
    });
    if (!file || !file.storageKey) {
      throw new RpcException({
        status: 404,
        message: "파일을 찾을 수 없습니다",
      });
    }
    if (file.contract.deletedAt) {
      throw new RpcException({
        status: 404,
        message: "계약이 삭제되었습니다",
      });
    }
    const viewer = await this.loadViewer(req.viewerId, ctx);
    const authz = evaluate(viewer, toAuthzContract(file.contract));
    if (!viewer || !authz.canView) {
      throw new RpcException({
        status: 403,
        message: "파일 다운로드 권한이 없습니다",
      });
    }
    if (file.comment?.deletedAt) {
      throw new RpcException({
        status: 404,
        message: "삭제된 코멘트의 첨부입니다",
      });
    }

    const encodedName = encodeURIComponent(file.name);
    const cmd = new GetObjectCommand({
      Bucket: this.r2.bucket as string,
      Key: file.storageKey,
      ResponseContentDisposition: `attachment; filename*=UTF-8''${encodedName}`,
    });
    const url = await getSignedUrl(this.r2.client as never, cmd, {
      expiresIn: PRESIGN_TTL_SEC,
    });
    return { url, expiresIn: PRESIGN_TTL_SEC };
  }

  /**
   * 비교 보고서 PDF 다운로드 감사 기록.
   *
   * - 클라이언트가 PDF blob 생성 직후 best-effort 로 호출(다운로드 자체를 막지 않음).
   * - 두 fileId 가 같은 contractId 의 파일인지 + viewer 가 canView 인지 검증해서
   *   임의 fileId/contractId 조합으로 가짜 감사 행을 만들지 못하게 한다.
   * - AuditService.record 자체도 best-effort 라 DB 쓰기 실패는 swallow → 응답 빈 객체.
   */
  async auditCompareReport(req: AuditCompareReportRequest): Promise<{ ok: true }> {
    const ctx = req.tenantContext!;
    const contract = await this.loadContract(req.contractId, ctx);
    const viewer = await this.authorizeCanView(contract, req.viewerId, ctx);
    const files = await this.prisma.file.findMany({
      where: {
        id: { in: [req.fileAId, req.fileBId] },
        contractId: req.contractId,
      },
      select: { id: true },
    });
    if (files.length !== 2) {
      throw new RpcException({
        status: 400,
        message: "두 파일이 같은 계약에 속하지 않습니다",
      });
    }
    await this.audit.record({
      action: "compare_report_download",
      targetType: "Contract",
      targetId: req.contractId,
      actorId: viewer.id,
      tenantId: contract.tenantId,
      detail: {
        fileAId: req.fileAId,
        fileAName: req.fileAName,
        fileBId: req.fileBId,
        fileBName: req.fileBName,
        addedLines: req.addedLines,
        removedLines: req.removedLines,
      },
    });
    return { ok: true };
  }
}
