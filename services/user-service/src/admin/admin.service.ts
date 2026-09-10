import { Injectable } from "@nestjs/common";
import { RpcException } from "@nestjs/microservices";
import { Prisma } from "@prisma/client";
import type {
  AdminAuditEntry,
  AdminAuditListResponse,
  AdminStatsResponse,
  AdminTenantDetailResponse,
  AdminTenantListItem,
  AdminTenantListResponse,
  AdminTenantUpdateRequest,
} from "@lawai/contracts";
import { PrismaService } from "../prisma/prisma.service";

const AUDIT_DEFAULT_LIMIT = 20;
const SIGNED_STATUSES = ["signed", "fulfilling", "closed"] as const;
const TENANT_AUDIT_LIMIT = 10;
const AUDIT_MAX_LIMIT = 100;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

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
   * 최근 감사 로그 — actor 이름까지 조인(User 1쿼리로 batch 조회 — N+1 회피).
   */
  async getRecentAudit(
    limitInput?: number,
  ): Promise<AdminAuditListResponse> {
    const limit = Math.min(
      Math.max(1, limitInput ?? AUDIT_DEFAULT_LIMIT),
      AUDIT_MAX_LIMIT,
    );
    const rows = await this.prisma.auditLog.findMany({
      take: limit,
      orderBy: { at: "desc" },
    });
    return { items: await this.attachActorNames(rows) };
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

  /** AuditLog rows 에 actorName 배치 조인(N+1 회피) — getRecentAudit/getTenant 공용. */
  private async attachActorNames(
    rows: {
      id: string;
      action: string;
      actorId: string;
      targetType: string;
      targetId: string;
      detail: unknown;
      at: Date;
    }[],
  ): Promise<AdminAuditEntry[]> {
    const actorIds = Array.from(new Set(rows.map((r) => r.actorId)));
    const users =
      actorIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: actorIds } },
            select: { id: true, name: true },
          })
        : [];
    const nameById = new Map(users.map((u) => [u.id, u.name]));
    return rows.map((r) => ({
      id: r.id,
      action: r.action,
      actorId: r.actorId,
      actorName: nameById.get(r.actorId) ?? null,
      targetType: r.targetType,
      targetId: r.targetId,
      detail: r.detail as Prisma.JsonValue,
      at: r.at.toISOString(),
    }));
  }
}
