import { Injectable } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import { Prisma } from "@prisma/client";
import type {
  AdminDeletedContractListResponse,
  AdminRestoreContractRequest,
  AdminRestoreContractResult,
  ContractStatus,
  AdminAuditEntry,
  AdminAuditListRequest,
  AdminAuditListResponse,
  AdminStatsResponse,
  AdminTenantDetailResponse,
  AdminTenantListItem,
  AdminTenantListResponse,
  AdminTenantUpdateRequest,
} from "@lawai/contracts";
import { ADMIN_AUDIT_ACTIONS } from "@lawai/contracts";
import { PrismaService } from "../prisma/prisma.service";

const AUDIT_DEFAULT_LIMIT = 20;
const SIGNED_STATUSES = ["signed", "fulfilling", "closed"] as const;
const TENANT_AUDIT_LIMIT = 10;
const AUDIT_MAX_LIMIT = 100;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
// 삭제된 계약 목록에 한 번에 보여줄 최대 건수(최근 삭제 순).
const DELETED_CONTRACT_LIMIT = 200;
const RESTORE_NOT_FOUND_MESSAGE = "삭제된 계약을 찾을 수 없습니다. 이미 복구됐을 수 있어요";

// 날짜 문자열 → Date. 비었거나 말이 안 되는 값이면 조건에서 뺀다.
const toDate = (iso?: string): Date | undefined => {
  if (!iso) return undefined;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

// 감사 로그 검색 조건 — 준 값만 넣는다. 모르는 행위 이름은 무시해 전체를 보여준다.
const buildAuditWhere = (req: AdminAuditListRequest): Prisma.AuditLogWhereInput => {
  const action = ADMIN_AUDIT_ACTIONS.find((known) => known === req.action);
  const from = toDate(req.from);
  const to = toDate(req.to);
  return {
    ...(req.tenantId ? { tenantId: req.tenantId } : {}),
    ...(req.actorId ? { actorId: req.actorId } : {}),
    ...(req.targetId ? { targetId: req.targetId } : {}),
    ...(action ? { action } : {}),
    ...(from || to
      ? { at: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
      : {}),
  };
};

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 대시보드 통계 — Prisma 집계 쿼리로 한 번에 산출.
   *
   * - contracts: deletedAt 미설정 행만(소프트 삭제 제외) groupBy status + 합계.
   * - users: 단순 총 count.
   * - files: R2 backing 있는(storageKey != null) 파일만 카운트/용량 합 — R2 안 쓰는 메타데이터 행은 제외.
   * - recentCompareReports: AuditLog 의 compare_report_download 액션 최근 7일.
   */
  async getStats(): Promise<AdminStatsResponse> {
    const now = new Date();
    const since = new Date(now.getTime() - SEVEN_DAYS_MS);

    const [
      contractGroups,
      contractTotal,
      userTotal,
      fileAgg,
      recentCompare,
    ] = await Promise.all([
      this.prisma.contract.groupBy({
        by: ["status"],
        where: { deletedAt: null },
        _count: { _all: true },
      }),
      this.prisma.contract.count({ where: { deletedAt: null } }),
      this.prisma.user.count(),
      this.prisma.file.aggregate({
        where: { storageKey: { not: null } },
        _count: { _all: true },
        _sum: { size: true },
      }),
      this.prisma.auditLog.count({
        where: { action: "compare_report_download", at: { gte: since } },
      }),
    ]);

    return {
      contracts: {
        total: contractTotal,
        byStatus: contractGroups.map((g) => ({
          status: g.status,
          count: g._count._all,
        })),
      },
      users: { total: userTotal },
      files: {
        total: fileAgg._count._all,
        bytesTotal: fileAgg._sum.size ?? 0,
      },
      recentCompareReports: recentCompare,
      generatedAt: now.toISOString(),
    };
  }

  /**
   * 감사 로그 조회 — 기간·회사·행위·사람으로 거르고 offset 으로 페이지를 넘긴다.
   * 사람·회사·대상 이름은 배치 조회로 붙이고(N+1 회피), total 은 조건에 맞는 전체 건수.
   */
  async getRecentAudit(
    req: AdminAuditListRequest = {},
  ): Promise<AdminAuditListResponse> {
    const limit = Math.min(
      Math.max(1, req.limit ?? AUDIT_DEFAULT_LIMIT),
      AUDIT_MAX_LIMIT,
    );
    const offset = Math.max(0, req.offset ?? 0);
    const where = buildAuditWhere(req);
    const actorIds = await this.findActorIdsByName(req.actorName);
    if (actorIds) {
      // 이름에 맞는 사람이 없으면 결과도 없다(조건 없이 전체를 보여주면 안 된다).
      if (actorIds.length === 0) return { items: [], total: 0 };
      where.actorId = { in: actorIds };
    }
    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { at: "desc" },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { items: await this.attachActorNames(rows), total };
  }

  /** 고객사 목록 + 전체 KPI — groupBy 4종 병렬 후 메모리 머지(테넌트 수십 규모 전제). */
  async listTenants(): Promise<AdminTenantListResponse> {
    const [tenants, memberGroups, contractGroups, activityGroups, userTotal, contractTotal] =
      await Promise.all([
        this.prisma.tenant.findMany({ orderBy: { createdAt: "asc" } }),
        this.prisma.userTenant.groupBy({ by: ["tenantId"], _count: { _all: true } }),
        this.prisma.contract.groupBy({
          by: ["tenantId"],
          where: { deletedAt: null },
          _count: { _all: true },
        }),
        this.prisma.auditLog.groupBy({ by: ["tenantId"], _max: { at: true } }),
        this.prisma.user.count(),
        this.prisma.contract.count({ where: { deletedAt: null } }),
      ]);

    const memberBy = new Map(memberGroups.map((g) => [g.tenantId, g._count._all]));
    const contractBy = new Map(contractGroups.map((g) => [g.tenantId, g._count._all]));
    const activityBy = new Map(activityGroups.map((g) => [g.tenantId, g._max.at]));

    const items: AdminTenantListItem[] = tenants.map((t) =>
      this.toTenantItem(t, {
        memberCount: memberBy.get(t.id) ?? 0,
        contractCount: contractBy.get(t.id) ?? 0,
        lastActivityAt: activityBy.get(t.id)?.toISOString() ?? null,
      }),
    );

    return {
      tenants: items,
      totals: {
        tenants: tenants.length,
        users: userTotal,
        contracts: contractTotal,
        trials: tenants.filter((t) => t.status === "trial").length,
      },
    };
  }

  /** 고객사 상세 — KPI/역할 구성/최근 활동(이 테넌트만). */
  async getTenant(tenantId: string): Promise<AdminTenantDetailResponse> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new RpcException({ status: 404, message: "고객사를 찾을 수 없습니다" });

    const [memberCount, activeContracts, signedContracts, fileAgg, roleGroups, auditRows] =
      await Promise.all([
        this.prisma.userTenant.count({ where: { tenantId } }),
        this.prisma.contract.count({
          where: { tenantId, deletedAt: null, status: { notIn: [...SIGNED_STATUSES] } },
        }),
        this.prisma.contract.count({
          where: { tenantId, deletedAt: null, status: { in: [...SIGNED_STATUSES] } },
        }),
        this.prisma.file.aggregate({
          where: { tenantId, storageKey: { not: null } },
          _sum: { size: true },
        }),
        this.prisma.userTenant.groupBy({
          by: ["role"],
          where: { tenantId },
          _count: { _all: true },
        }),
        this.prisma.auditLog.findMany({
          where: { tenantId },
          take: TENANT_AUDIT_LIMIT,
          orderBy: { at: "desc" },
        }),
      ]);

    const recentAudit = await this.attachActorNames(auditRows);

    return {
      tenant: this.toTenantItem(tenant, {
        memberCount,
        contractCount: activeContracts + signedContracts,
        lastActivityAt: auditRows[0]?.at.toISOString() ?? null,
      }),
      stats: {
        memberCount,
        activeContracts,
        signedContracts,
        storageBytes: fileAgg._sum.size ?? 0,
      },
      roleBreakdown: roleGroups.map((g) => ({ role: g.role, count: g._count._all })),
      recentAudit,
    };
  }

  /** 요금제/상태/체험판만료 변경 + 감사 기록(action=update, targetType=Tenant). */
  /** 삭제된 계약 목록(전 고객사, 최근 삭제 순) — 회사 이름·작성자·삭제한 사람(감사 기록)·삭제 시각. */
  async listDeletedContracts(): Promise<AdminDeletedContractListResponse> {
    const rows = await this.prisma.contract.findMany({
      where: { deletedAt: { not: null } },
      orderBy: { deletedAt: "desc" },
      take: DELETED_CONTRACT_LIMIT,
      select: {
        id: true,
        code: true,
        title: true,
        status: true,
        tenantId: true,
        deletedAt: true,
        createdBy: { select: { name: true } },
      },
    });
    if (rows.length === 0) return { items: [] };

    const [tenants, deleteLogs] = await Promise.all([
      this.prisma.tenant.findMany({
        where: { id: { in: Array.from(new Set(rows.map((row) => row.tenantId))) } },
        select: { id: true, name: true },
      }),
      this.prisma.auditLog.findMany({
        where: { targetType: "Contract", action: "delete", targetId: { in: rows.map((row) => row.id) } },
        orderBy: { at: "desc" },
        select: { targetId: true, actorId: true },
      }),
    ]);
    // 지웠다 복구했다 다시 지운 계약은 가장 최근 삭제 기록을 쓴다(at desc 라 처음 만난 기록).
    const deleterIdByContractId = new Map<string, string>();
    for (const log of deleteLogs) {
      if (!deleterIdByContractId.has(log.targetId)) deleterIdByContractId.set(log.targetId, log.actorId);
    }
    const deleters = await this.prisma.user.findMany({
      where: { id: { in: Array.from(new Set(deleterIdByContractId.values())) } },
      select: { id: true, name: true },
    });

    const tenantNameById = new Map(tenants.map((tenant) => [tenant.id, tenant.name]));
    const userNameById = new Map(deleters.map((user) => [user.id, user.name]));
    return {
      items: rows.map((row) => {
        const deleterId = deleterIdByContractId.get(row.id);
        return {
          id: row.id,
          code: row.code,
          title: row.title,
          status: row.status as ContractStatus,
          tenantId: row.tenantId,
          tenantName: tenantNameById.get(row.tenantId) ?? "",
          createdByName: row.createdBy?.name ?? null,
          deletedByName: deleterId ? (userNameById.get(deleterId) ?? null) : null,
          deletedAt: (row.deletedAt as Date).toISOString(),
        };
      }),
    };
  }

  /** 삭제된 계약 복구 — 삭제 표시를 지우고 감사 기록. 없거나 이미 복구된 계약은 404. */
  async restoreContract(req: AdminRestoreContractRequest): Promise<AdminRestoreContractResult> {
    const row = await this.prisma.contract.findFirst({
      where: { id: req.contractId, deletedAt: { not: null } },
      select: { id: true, code: true, title: true, tenantId: true },
    });
    if (!row) throw new RpcException({ status: 404, message: RESTORE_NOT_FOUND_MESSAGE });

    // 두 관리자가 동시에 누른 경우에 대비해 "아직 삭제 상태일 때만" 되돌린다.
    const { count } = await this.prisma.contract.updateMany({
      where: { id: row.id, deletedAt: { not: null } },
      data: { deletedAt: null },
    });
    if (count === 0) throw new RpcException({ status: 404, message: RESTORE_NOT_FOUND_MESSAGE });

    await this.prisma.auditLog.create({
      data: {
        action: "restore",
        actorId: req.actorId,
        targetType: "Contract",
        targetId: row.id,
        tenantId: row.tenantId,
        detail: { code: row.code, title: row.title },
      },
    });
    return { ok: true };
  }

  async updateTenant(
    req: AdminTenantUpdateRequest & { actorId: string },
  ): Promise<AdminTenantListItem> {
    const { tenantId, actorId, ...changes } = req;
    if (!tenantId) throw new RpcException({ status: 400, message: "tenantId가 필요합니다" });
    const before = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!before) throw new RpcException({ status: 404, message: "고객사를 찾을 수 없습니다" });

    const data: { plan?: typeof before.plan; status?: typeof before.status; trialEndsAt?: Date | null } = {};
    if (changes.plan !== undefined) data.plan = changes.plan;
    if (changes.status !== undefined) data.status = changes.status;
    if (changes.trialEndsAt !== undefined) {
      data.trialEndsAt = changes.trialEndsAt === null ? null : new Date(changes.trialEndsAt);
    }

    const updated = await this.prisma.tenant.update({ where: { id: tenantId }, data });

    await this.prisma.auditLog.create({
      data: {
        action: "update",
        actorId,
        targetType: "Tenant",
        targetId: tenantId,
        tenantId,
        detail: {
          before: {
            plan: before.plan,
            status: before.status,
            trialEndsAt: before.trialEndsAt?.toISOString() ?? null,
          },
          after: {
            plan: updated.plan,
            status: updated.status,
            trialEndsAt: updated.trialEndsAt?.toISOString() ?? null,
          },
        },
      },
    });

    const [memberCount, contractCount] = await Promise.all([
      this.prisma.userTenant.count({ where: { tenantId } }),
      this.prisma.contract.count({ where: { tenantId, deletedAt: null } }),
    ]);
    const lastAudit = await this.prisma.auditLog.findMany({
      where: { tenantId },
      take: 1,
      orderBy: { at: "desc" },
    });
    return this.toTenantItem(updated, {
      memberCount,
      contractCount,
      lastActivityAt: lastAudit[0]?.at.toISOString() ?? null,
    });
  }

  /** Tenant 행 + 집계값 → DTO 매핑(단일 출처). */
  private toTenantItem(
    t: {
      id: string;
      name: string;
      plan: AdminTenantListItem["plan"];
      status: AdminTenantListItem["status"];
      trialEndsAt: Date | null;
      createdAt: Date;
    },
    agg: { memberCount: number; contractCount: number; lastActivityAt: string | null },
  ): AdminTenantListItem {
    return {
      id: t.id,
      name: t.name,
      plan: t.plan,
      status: t.status,
      trialEndsAt: t.trialEndsAt?.toISOString() ?? null,
      createdAt: t.createdAt.toISOString(),
      ...agg,
    };
  }

  /** 이름 일부로 사람 찾기 — 감사 로그의 "누가" 검색. 검색어가 없으면 undefined(조건 없음). */
  private async findActorIdsByName(name?: string): Promise<string[] | undefined> {
    const keyword = name?.trim();
    if (!keyword) return undefined;
    const users = await this.prisma.user.findMany({
      where: { name: { contains: keyword, mode: "insensitive" } },
      select: { id: true },
    });
    return users.map((user) => user.id);
  }

  /**
   * AuditLog rows 에 사람·회사·대상 이름을 배치 조인(N+1 회피) — getRecentAudit/getTenant 공용.
   * 대상 이름은 계약이면 계약 제목, 고객사면 회사 이름. 지워져서 못 찾으면 null(화면이 id 로 대신 보여준다).
   */
  private async attachActorNames(
    rows: {
      id: string;
      action: string;
      actorId: string;
      targetType: string;
      targetId: string;
      tenantId: string;
      detail: unknown;
      at: Date;
    }[],
  ): Promise<AdminAuditEntry[]> {
    const actorIds = Array.from(new Set(rows.map((r) => r.actorId)));
    const tenantIds = Array.from(new Set(rows.map((r) => r.tenantId)));
    const contractIds = Array.from(
      new Set(rows.filter((r) => r.targetType === "Contract").map((r) => r.targetId)),
    );
    // 빈 배열도 타입을 적어 둔다 — 그냥 [] 를 쓰면 이름 타입이 흐려진다.
    const noNames: { id: string; name: string }[] = [];
    const noTitles: { id: string; title: string }[] = [];
    const [users, tenants, contracts] = await Promise.all([
      actorIds.length > 0
        ? this.prisma.user.findMany({
            where: { id: { in: actorIds } },
            select: { id: true, name: true },
          })
        : noNames,
      tenantIds.length > 0
        ? this.prisma.tenant.findMany({
            where: { id: { in: tenantIds } },
            select: { id: true, name: true },
          })
        : noNames,
      contractIds.length > 0
        ? this.prisma.contract.findMany({
            where: { id: { in: contractIds } },
            select: { id: true, title: true },
          })
        : noTitles,
    ]);
    const nameById = new Map(users.map((u) => [u.id, u.name]));
    const tenantNameById = new Map(tenants.map((t) => [t.id, t.name]));
    const titleById = new Map(contracts.map((c) => [c.id, c.title]));
    const getTargetTitle = (row: { targetType: string; targetId: string }): string | null => {
      if (row.targetType === "Contract") return titleById.get(row.targetId) ?? null;
      if (row.targetType === "Tenant") return tenantNameById.get(row.targetId) ?? null;
      return null;
    };
    return rows.map((r) => ({
      id: r.id,
      action: r.action,
      actorId: r.actorId,
      actorName: nameById.get(r.actorId) ?? null,
      targetType: r.targetType,
      targetId: r.targetId,
      targetTitle: getTargetTitle(r),
      tenantId: r.tenantId,
      tenantName: tenantNameById.get(r.tenantId) ?? null,
      detail: r.detail as Prisma.JsonValue,
      at: r.at.toISOString(),
    }));
  }
}
