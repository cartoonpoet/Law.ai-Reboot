import { Injectable } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import type {
  CreateTemplateRequest,
  CreateTemplateResponse,
  CreateTemplateVersionRequest,
  GetTemplateRequest,
  ListTemplatesRequest,
  ListTemplatesResponse,
  ListTemplateVersionsRequest,
  ListTemplateVersionsResponse,
  RevertTemplateVersionRequest,
  TemplateCategoryTypes,
  TemplateDetailDto,
  TemplateSummaryDto,
  TemplateVersionDto,
  TenantContext,
  TenantRole,
} from "@lawai/contracts";
import { PrismaService } from "../prisma/prisma.service";
import { resolveTenantId, tenantScope } from "../common/tenant-scope";

const NOT_FOUND_MESSAGE = "양식을 찾을 수 없습니다";
const TEMPLATE_CATEGORIES: TemplateCategoryTypes[] = ["nda", "service", "supply", "entrust", "license", "etc"];
// 표준양식 "관리"(만들기/새 버전/되돌리기)를 할 수 있는 역할 — 시스템 관리자는 별도 처리(isSystemAdmin).
const MANAGE_ROLES: TenantRole[] = ["inHouseCounsel"];

const requireName = (value: string): string => {
  const name = value?.trim() ?? "";
  if (name.length === 0) throw new RpcException({ status: 400, message: "양식 이름을 입력해 주세요" });
  return name;
};

type TemplateWithVersions = Awaited<ReturnType<DocumentTemplatesService["findTemplateWithLatest"]>>;

/**
 * 표준양식(템플릿) — 회사(테넌트)별 계약서 양식 CRUD, 불변 버전 이력, 되돌리기(=옛 버전을 새 버전으로 저장).
 * 관리(만들기/새 버전/되돌리기)는 inHouseCounsel·시스템관리자만, 조회(목록/상세)는 테넌트 구성원 누구나.
 */
@Injectable()
export class DocumentTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(req: CreateTemplateRequest): Promise<CreateTemplateResponse> {
    const tenantId = resolveTenantId(req.tenantContext);
    await this.requireCanManage(req.viewerId, req.tenantContext);
    const name = requireName(req.name);

    const row = await this.prisma.contractTemplate.create({
      data: {
        tenantId,
        categoryId: req.categoryId,
        name,
        createdById: req.viewerId,
        versions: { create: { versionNo: 1, content: req.content as object, createdById: req.viewerId } },
      },
      include: { versions: { orderBy: { versionNo: "desc" }, take: 1 } },
    });
    return { template: await this.toDetail(row) };
  }

  async list(req: ListTemplatesRequest): Promise<ListTemplatesResponse> {
    await this.requireMember(req.viewerId, req.tenantContext);
    const q = req.q?.trim();
    const where = {
      deletedAt: null,
      ...tenantScope(req.tenantContext),
      ...(req.categoryId ? { categoryId: req.categoryId } : {}),
      ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
    };

    const [rows, grouped] = await Promise.all([
      this.prisma.contractTemplate.findMany({ where, orderBy: { updatedAt: "desc" } }),
      this.prisma.contractTemplate.groupBy({
        by: ["categoryId"],
        where: { deletedAt: null, ...tenantScope(req.tenantContext) },
        _count: { _all: true },
      }),
    ]);

    const people = await this.loadPeople(rows.map((row) => row.createdById));
    const counts = Object.fromEntries(TEMPLATE_CATEGORIES.map((c) => [c, 0])) as Record<TemplateCategoryTypes, number>;
    grouped.forEach((g) => {
      counts[g.categoryId] = g._count._all;
    });

    return { items: rows.map((row) => this.toSummary(row, people)), counts };
  }

  async get(req: GetTemplateRequest): Promise<TemplateDetailDto> {
    await this.requireMember(req.viewerId, req.tenantContext);
    const row = await this.findTemplateWithLatest(req.id, req.tenantContext);
    return this.toDetail(row);
  }

  async createVersion(req: CreateTemplateVersionRequest): Promise<TemplateDetailDto> {
    await this.requireCanManage(req.viewerId, req.tenantContext);
    const current = await this.findVisible(req.id, req.tenantContext);
    const nextVersionNo = current.currentVersionNo + 1;

    await this.prisma.$transaction([
      this.prisma.contractTemplateVersion.create({
        data: {
          templateId: current.id,
          versionNo: nextVersionNo,
          content: req.content as object,
          clauseCount: req.clauseCount,
          createdById: req.viewerId,
        },
      }),
      this.prisma.contractTemplate.update({ where: { id: current.id }, data: { currentVersionNo: nextVersionNo } }),
    ]);

    const row = await this.findTemplateWithLatest(req.id, req.tenantContext);
    return this.toDetail(row);
  }

  async listVersions(req: ListTemplateVersionsRequest): Promise<ListTemplateVersionsResponse> {
    await this.requireMember(req.viewerId, req.tenantContext);
    await this.findVisible(req.id, req.tenantContext);
    const rows = await this.prisma.contractTemplateVersion.findMany({
      where: { templateId: req.id },
      orderBy: { versionNo: "desc" },
    });
    const people = await this.loadPeople(rows.map((row) => row.createdById));
    return { versions: rows.map((row) => this.toVersionDto(row, people)) };
  }

  // 되돌리기 = 옛 버전 content 를 그대로 새 버전으로 저장(불변 이력을 지우지 않는다).
  async revert(req: RevertTemplateVersionRequest): Promise<TemplateDetailDto> {
    await this.requireCanManage(req.viewerId, req.tenantContext);
    const current = await this.findVisible(req.id, req.tenantContext);
    const target = await this.prisma.contractTemplateVersion.findUnique({
      where: { templateId_versionNo: { templateId: current.id, versionNo: req.toVersionNo } },
    });
    if (!target) throw new RpcException({ status: 404, message: "되돌릴 버전을 찾을 수 없습니다" });

    const nextVersionNo = current.currentVersionNo + 1;
    await this.prisma.$transaction([
      this.prisma.contractTemplateVersion.create({
        data: {
          templateId: current.id,
          versionNo: nextVersionNo,
          content: target.content as object,
          clauseCount: target.clauseCount,
          createdById: req.viewerId,
        },
      }),
      this.prisma.contractTemplate.update({ where: { id: current.id }, data: { currentVersionNo: nextVersionNo } }),
    ]);

    const row = await this.findTemplateWithLatest(req.id, req.tenantContext);
    return this.toDetail(row);
  }

  private async findVisible(id: string, ctx: TenantContext) {
    const row = await this.prisma.contractTemplate.findFirst({ where: { id, deletedAt: null, ...tenantScope(ctx) } });
    if (!row) throw new RpcException({ status: 404, message: NOT_FOUND_MESSAGE });
    return row;
  }

  private async findTemplateWithLatest(id: string, ctx: TenantContext) {
    const row = await this.prisma.contractTemplate.findFirst({
      where: { id, deletedAt: null, ...tenantScope(ctx) },
      include: { versions: { orderBy: { versionNo: "desc" }, take: 1 } },
    });
    if (!row || row.versions.length === 0) throw new RpcException({ status: 404, message: NOT_FOUND_MESSAGE });
    return row;
  }

  private async requireMember(viewerId: string, ctx: TenantContext): Promise<void> {
    if (ctx.isSystemAdmin) return;
    const membership = await this.prisma.userTenant.findFirst({ where: { userId: viewerId, tenantId: ctx.tenantId } });
    if (!membership) throw new RpcException({ status: 403, message: "회사 구성원만 이용할 수 있습니다" });
  }

  // 표준양식 관리(만들기/새 버전/되돌리기) 권한 — 프런트 canManageDocumentTemplates.ts 와 같은 판정.
  private async requireCanManage(viewerId: string, ctx: TenantContext): Promise<void> {
    if (ctx.isSystemAdmin) return;
    const membership = await this.prisma.userTenant.findFirst({
      where: { userId: viewerId, tenantId: ctx.tenantId },
      select: { role: true },
    });
    if (!membership || !MANAGE_ROLES.includes(membership.role)) {
      throw new RpcException({ status: 403, message: "표준양식 관리 권한이 없습니다" });
    }
  }

  private async loadPeople(ids: string[]): Promise<Map<string, string | null>> {
    const uniqueIds = Array.from(new Set(ids));
    if (uniqueIds.length === 0) return new Map();
    const users = await this.prisma.user.findMany({ where: { id: { in: uniqueIds } }, select: { id: true, name: true } });
    return new Map(users.map((user) => [user.id, user.name]));
  }

  private toSummary(
    row: { id: string; categoryId: string; name: string; currentVersionNo: number; createdById: string; createdAt: Date; updatedAt: Date },
    people: Map<string, string | null>,
  ): TemplateSummaryDto {
    return {
      id: row.id,
      categoryId: row.categoryId as TemplateCategoryTypes,
      name: row.name,
      currentVersionNo: row.currentVersionNo,
      createdById: row.createdById,
      createdByName: people.get(row.createdById) ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toVersionDto(
    row: { versionNo: number; content: unknown; clauseCount: number | null; createdById: string; createdAt: Date },
    people: Map<string, string | null>,
  ): TemplateVersionDto {
    return {
      versionNo: row.versionNo,
      content: row.content as Record<string, unknown>,
      clauseCount: row.clauseCount,
      createdById: row.createdById,
      createdByName: people.get(row.createdById) ?? null,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private async toDetail(row: TemplateWithVersions): Promise<TemplateDetailDto> {
    const people = await this.loadPeople([row.createdById, row.versions[0].createdById]);
    return { ...this.toSummary(row, people), currentVersion: this.toVersionDto(row.versions[0], people) };
  }
}
