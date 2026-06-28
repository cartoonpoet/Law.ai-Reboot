import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type {
  AdminAuditEntry,
  AdminAuditListResponse,
  AdminStatsResponse,
} from "@lawai/contracts";
import { PrismaService } from "../prisma/prisma.service";

const AUDIT_DEFAULT_LIMIT = 20;
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
    const actorIds = Array.from(new Set(rows.map((r) => r.actorId)));
    const users =
      actorIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: actorIds } },
            select: { id: true, name: true },
          })
        : [];
    const nameById = new Map(users.map((u) => [u.id, u.name]));
    const items: AdminAuditEntry[] = rows.map((r) => ({
      id: r.id,
      action: r.action,
      actorId: r.actorId,
      actorName: nameById.get(r.actorId) ?? null,
      targetType: r.targetType,
      targetId: r.targetId,
      detail: r.detail as Prisma.JsonValue,
      at: r.at.toISOString(),
    }));
    return { items };
  }
}
