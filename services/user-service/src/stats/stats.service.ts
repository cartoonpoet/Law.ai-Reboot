import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { RpcException } from "@nestjs/microservices";
import type {
  TenantContext,
  CycleTimeMonthly,
  CycleTimeOverdueRow,
  CycleTimeOwner,
  CycleTimeStage,
  CycleTimeStatsRequest,
  CycleTimeStatsResponse,
  CycleTimeTargetTypes,
} from "@lawai/contracts";
import { PrismaService } from "../prisma/prisma.service";
import { resolveTenantId } from "../common/tenant-scope";
import { getDefaultRange, getStageLabel, getTargetConfig, roundDays } from "./cycle-time.config";

/** SQL 이 돌려주는 단계별 집계 한 줄. */
interface StageRow {
  status: string;
  doneCount: bigint;
  avgDays: number | null;
  medianDays: number | null;
  openCount: bigint;
  overdueCount: bigint;
}

interface TotalRow {
  doneCount: bigint;
  avgDays: number | null;
  medianDays: number | null;
  openCount: bigint;
}

interface MonthlyRow {
  month: string;
  doneCount: bigint;
  avgDays: number | null;
}

interface OwnerRow {
  ownerId: string;
  doneCount: bigint;
  avgDays: number | null;
}

interface OverdueCountRow {
  status: string;
  overdueCount: bigint;
}

interface OverdueRow {
  targetId: string;
  status: string;
  days: number;
  ownerId: string | null;
}

const toNumber = (value: bigint | number | null): number => (value === null ? 0 : Number(value));

/**
 * 단계별 소요시간 집계.
 *
 * StatusEvent 를 대상별로 시간순으로 세워, 한 줄의 `at` 과 다음 줄의 `at` 사이를 "그 상태에 머문 시간"으로 본다.
 * 다음 줄이 없으면 아직 그 상태에 머물러 있는 것이다(평균에는 넣지 않고 지연 판정에만 쓴다).
 */
@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async cycleTime(req: CycleTimeStatsRequest): Promise<CycleTimeStatsResponse> {
    const tenantId = resolveTenantId(req.tenantContext);
    await this.ensureLegalTeam(req.viewerId, req.tenantContext);
    const targetType = req.targetType;
    if (targetType !== "contract" && targetType !== "advice") {
      throw new RpcException({ status: 400, message: "알 수 없는 통계 대상입니다" });
    }
    const config = getTargetConfig(targetType);
    const range = this.resolveRange(req.from, req.to);
    const ownerFilter = req.ownerId
      ? Prisma.sql`AND e."ownerId" = ${req.ownerId}`
      : Prisma.empty;

    // 지워진 계약·자문은 통계에서 뺀다. 지우면 상태 기록이 더 안 쌓여 영원히 "머물러 있는 건"으로 남기 때문이다.
    const notDeleted =
      targetType === "contract"
        ? Prisma.sql`AND EXISTS (SELECT 1 FROM "contracts"."Contract" t WHERE t."id" = e."targetId" AND t."deletedAt" IS NULL)`
        : Prisma.sql`AND EXISTS (SELECT 1 FROM "contracts"."Advice" t WHERE t."id" = e."targetId" AND t."deletedAt" IS NULL)`;

    // 대상별로 시간순으로 세우고 다음 기록 시각을 붙인다.
    const segments = Prisma.sql`
      SELECT
        e."targetId",
        e."toStatus" AS status,
        e."ownerId",
        e."at",
        LEAD(e."at") OVER (PARTITION BY e."targetId" ORDER BY e."at") AS "nextAt"
      FROM "shared"."StatusEvent" e
      WHERE e."tenantId" = ${tenantId}
        AND e."targetType" = ${targetType}
        ${ownerFilter}
        ${notDeleted}
    `;

    // 끝난 구간은 "끝난 날" 기준으로 기간을 자른다(전체 소요시간·월별과 같은 기준).
    const doneInRange = Prisma.sql`
      SELECT * FROM (${segments}) s
      WHERE s."nextAt" IS NOT NULL AND s."nextAt" >= ${range.fromDate} AND s."nextAt" < ${range.toDate}
    `;

    const [stageRows, totalRow, monthlyRows, ownerRows, overdueRows, overdueCounts, since] = await Promise.all([
      this.queryStages(doneInRange, segments, config.stages.map((stage) => stage.status)),
      this.queryTotal(tenantId, targetType, config.doneStatuses, range, notDeleted, req.ownerId),
      this.queryMonthly(tenantId, targetType, config.doneStatuses, range, notDeleted, req.ownerId),
      this.queryOwners(tenantId, targetType, config.doneStatuses, range, notDeleted, req.ownerId),
      this.queryOverdue(segments, config.stages),
      this.queryOverdueCounts(segments, config.stages),
      this.queryRecordedSince(tenantId, targetType),
    ]);

    const names = await this.loadNames(tenantId, [
      ...ownerRows.map((row) => row.ownerId),
      ...overdueRows.map((row) => row.ownerId).filter((id): id is string => id !== null),
    ]);
    const meta = await this.loadTargetMeta(
      targetType,
      tenantId,
      overdueRows.map((row) => row.targetId),
    );

    return {
      targetType,
      from: range.from,
      to: range.to,
      total: {
        label: config.totalLabel,
        targetDays: config.totalTargetDays,
        avgDays: roundDays(totalRow?.avgDays ?? null),
        medianDays: roundDays(totalRow?.medianDays ?? null),
        doneCount: toNumber(totalRow?.doneCount ?? 0),
        openCount: toNumber(totalRow?.openCount ?? 0),
      },
      stages: this.toStages(targetType, stageRows, overdueCounts),
      monthly: monthlyRows.map(
        (row): CycleTimeMonthly => ({
          month: row.month,
          avgDays: roundDays(row.avgDays),
          doneCount: toNumber(row.doneCount),
        }),
      ),
      owners: ownerRows.map(
        (row): CycleTimeOwner => ({
          ownerId: row.ownerId,
          ownerName: names[row.ownerId] ?? null,
          doneCount: toNumber(row.doneCount),
          avgDays: roundDays(row.avgDays),
        }),
      ),
      overdue: overdueRows.map(
        (row): CycleTimeOverdueRow => ({
          targetId: row.targetId,
          code: meta[row.targetId]?.code ?? "-",
          title: meta[row.targetId]?.title ?? "(삭제된 건)",
          status: row.status,
          statusLabel: getStageLabel(targetType, row.status),
          days: roundDays(row.days) ?? 0,
          targetDays:
            config.stages.find((stage) => stage.status === row.status)?.targetDays ?? 0,
          ownerId: row.ownerId,
          ownerName: row.ownerId ? names[row.ownerId] ?? null : null,
        }),
      ),
      recordedSince: since ? since.toISOString() : null,
    };
  }

  /**
   * 업무 통계는 법무팀만 본다.
   * 회사 전체 평균·담당자별 처리량·지연 건 제목까지 담고 있어, 계약 상세에서 막아 둔 정보가
   * 통계로 새지 않도록 상세 조회와 같은 기준(사내변호사 · 시스템관리자)으로 막는다.
   */
  private async ensureLegalTeam(viewerId: string, ctx: TenantContext): Promise<void> {
    if (ctx.isSystemAdmin) return;
    const membership = await this.prisma.userTenant.findFirst({
      where: { userId: viewerId, tenantId: ctx.tenantId },
      select: { role: true },
    });
    if (!membership) {
      throw new RpcException({ status: 403, message: "회사 구성원만 이용할 수 있습니다" });
    }
    if (membership.role !== "inHouseCounsel") {
      throw new RpcException({ status: 403, message: "업무 통계는 법무팀만 볼 수 있습니다" });
    }
  }

  private resolveRange(from?: string, to?: string): { from: string; to: string; fromDate: Date; toDate: Date } {
    const fallback = getDefaultRange(new Date());
    const fromValue = from ?? fallback.from;
    const toValue = to ?? fallback.to;
    const fromDate = new Date(`${fromValue}T00:00:00.000Z`);
    // to 는 그날까지 포함 — 다음 날 0시 직전까지 본다.
    const toDate = new Date(`${toValue}T00:00:00.000Z`);
    toDate.setUTCDate(toDate.getUTCDate() + 1);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      throw new RpcException({ status: 400, message: "기간이 올바르지 않습니다" });
    }
    if (fromDate >= toDate) {
      throw new RpcException({ status: 400, message: "시작일이 종료일보다 뒤입니다" });
    }
    return { from: fromValue, to: toValue, fromDate, toDate };
  }

  /**
   * 단계별 수치.
   * - 평균·중앙값·완료 건수: 그 단계를 **기간 안에 빠져나간** 구간만 센다.
   * - 진행 건수: 기간과 무관하게 **지금** 그 단계에 머물러 있는 건.
   * 두 기준이 다르므로 한 쿼리에서 같이 세지 않고 합친다.
   */
  private async queryStages(
    doneInRange: Prisma.Sql,
    segments: Prisma.Sql,
    statuses: string[],
  ): Promise<StageRow[]> {
    if (statuses.length === 0) return [];
    const [doneRows, openRows] = await Promise.all([
      this.prisma.$queryRaw<{ status: string; doneCount: bigint; avgDays: number | null; medianDays: number | null }[]>(
        Prisma.sql`
          SELECT
            r.status,
            count(*) AS "doneCount",
            avg(EXTRACT(EPOCH FROM (r."nextAt" - r."at")) / 86400) AS "avgDays",
            percentile_cont(0.5) WITHIN GROUP (
              ORDER BY EXTRACT(EPOCH FROM (r."nextAt" - r."at")) / 86400
            ) AS "medianDays"
          FROM (${doneInRange}) r
          WHERE r.status IN (${Prisma.join(statuses)})
          GROUP BY r.status
        `,
      ),
      this.prisma.$queryRaw<{ status: string; openCount: bigint }[]>(Prisma.sql`
        SELECT s.status, count(*) AS "openCount"
        FROM (${segments}) s
        WHERE s."nextAt" IS NULL AND s.status IN (${Prisma.join(statuses)})
        GROUP BY s.status
      `),
    ]);
    const openByStatus = new Map(openRows.map((row) => [row.status, row.openCount]));
    const statusesSeen = new Set([...doneRows.map((r) => r.status), ...openRows.map((r) => r.status)]);
    return Array.from(statusesSeen).map((status) => {
      const done = doneRows.find((row) => row.status === status);
      return {
        status,
        doneCount: done?.doneCount ?? BigInt(0),
        avgDays: done?.avgDays ?? null,
        medianDays: done?.medianDays ?? null,
        openCount: openByStatus.get(status) ?? BigInt(0),
        overdueCount: BigInt(0),
      };
    });
  }

  // 처음 기록 → 끝난 상태 진입까지. 기간은 "끝난 날" 기준으로 자른다.
  private async queryTotal(
    tenantId: string,
    targetType: CycleTimeTargetTypes,
    doneStatuses: string[],
    range: { fromDate: Date; toDate: Date },
    notDeleted: Prisma.Sql,
    ownerId?: string,
  ): Promise<TotalRow | undefined> {
    const rows = await this.prisma.$queryRaw<TotalRow[]>(Prisma.sql`
      WITH bounds AS (
        SELECT
          e."targetId",
          min(e."at") AS "startedAt",
          min(e."at") FILTER (WHERE e."toStatus" IN (${Prisma.join(doneStatuses)})) AS "doneAt"
        FROM "shared"."StatusEvent" e
        WHERE e."tenantId" = ${tenantId}
          AND e."targetType" = ${targetType}
          ${ownerId ? Prisma.sql`AND e."ownerId" = ${ownerId}` : Prisma.empty}
          ${notDeleted}
        GROUP BY e."targetId"
      )
      SELECT
        count(*) FILTER (WHERE "doneAt" IS NOT NULL AND "doneAt" >= ${range.fromDate} AND "doneAt" < ${range.toDate}) AS "doneCount",
        avg(EXTRACT(EPOCH FROM ("doneAt" - "startedAt")) / 86400)
          FILTER (WHERE "doneAt" IS NOT NULL AND "doneAt" >= ${range.fromDate} AND "doneAt" < ${range.toDate}) AS "avgDays",
        percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM ("doneAt" - "startedAt")) / 86400)
          FILTER (WHERE "doneAt" IS NOT NULL AND "doneAt" >= ${range.fromDate} AND "doneAt" < ${range.toDate}) AS "medianDays",
        count(*) FILTER (WHERE "doneAt" IS NULL) AS "openCount"
      FROM bounds
    `);
    return rows[0];
  }

  private queryMonthly(
    tenantId: string,
    targetType: CycleTimeTargetTypes,
    doneStatuses: string[],
    range: { fromDate: Date; toDate: Date },
    notDeleted: Prisma.Sql,
    ownerId?: string,
  ): Promise<MonthlyRow[]> {
    return this.prisma.$queryRaw<MonthlyRow[]>(Prisma.sql`
      WITH bounds AS (
        SELECT
          e."targetId",
          min(e."at") AS "startedAt",
          min(e."at") FILTER (WHERE e."toStatus" IN (${Prisma.join(doneStatuses)})) AS "doneAt"
        FROM "shared"."StatusEvent" e
        WHERE e."tenantId" = ${tenantId}
          AND e."targetType" = ${targetType}
          ${ownerId ? Prisma.sql`AND e."ownerId" = ${ownerId}` : Prisma.empty}
          ${notDeleted}
        GROUP BY e."targetId"
      )
      SELECT
        to_char("doneAt", 'YYYY-MM') AS month,
        count(*) AS "doneCount",
        avg(EXTRACT(EPOCH FROM ("doneAt" - "startedAt")) / 86400) AS "avgDays"
      FROM bounds
      WHERE "doneAt" IS NOT NULL AND "doneAt" >= ${range.fromDate} AND "doneAt" < ${range.toDate}
      GROUP BY 1
      ORDER BY 1
    `);
  }

  private queryOwners(
    tenantId: string,
    targetType: CycleTimeTargetTypes,
    doneStatuses: string[],
    range: { fromDate: Date; toDate: Date },
    notDeleted: Prisma.Sql,
    ownerId?: string,
  ): Promise<OwnerRow[]> {
    return this.prisma.$queryRaw<OwnerRow[]>(Prisma.sql`
      WITH bounds AS (
        SELECT
          e."targetId",
          -- 담당자는 "마지막으로 알려진" 담당자로 본다(재배정되면 마지막 담당자에게 귀속된다).
          -- 담당자가 비어 있는 기록은 건너뛴다 — 마지막 기록에 담당자가 없다고 그 건을 통째로 빼면 안 된다.
          (array_agg(e."ownerId" ORDER BY e."at" DESC) FILTER (WHERE e."ownerId" IS NOT NULL))[1] AS "ownerId",
          min(e."at") AS "startedAt",
          min(e."at") FILTER (WHERE e."toStatus" IN (${Prisma.join(doneStatuses)})) AS "doneAt"
        FROM "shared"."StatusEvent" e
        WHERE e."tenantId" = ${tenantId} AND e."targetType" = ${targetType}
          ${ownerId ? Prisma.sql`AND e."ownerId" = ${ownerId}` : Prisma.empty}
          ${notDeleted}
        GROUP BY e."targetId"
      )
      SELECT
        "ownerId",
        count(*) AS "doneCount",
        avg(EXTRACT(EPOCH FROM ("doneAt" - "startedAt")) / 86400) AS "avgDays"
      FROM bounds
      WHERE "ownerId" IS NOT NULL
        AND "doneAt" IS NOT NULL
        AND "doneAt" >= ${range.fromDate}
        AND "doneAt" < ${range.toDate}
      GROUP BY 1
      ORDER BY 2 DESC
      LIMIT 10
    `);
  }

  // 지금 머물러 있으면서 목표일을 넘긴 건. 기간과 무관하게 "지금" 기준으로 본다.
  private async queryOverdue(
    segments: Prisma.Sql,
    stages: { status: string; targetDays: number }[],
  ): Promise<OverdueRow[]> {
    if (stages.length === 0) return [];
    const conditions = stages.map(
      (stage) =>
        Prisma.sql`(s.status = ${stage.status} AND now() - s."at" > ${`${stage.targetDays} days`}::interval)`,
    );
    return this.prisma.$queryRaw<OverdueRow[]>(Prisma.sql`
      SELECT
        s."targetId",
        s.status,
        EXTRACT(EPOCH FROM (now() - s."at")) / 86400 AS days,
        s."ownerId"
      FROM (${segments}) s
      WHERE s."nextAt" IS NULL AND (${Prisma.join(conditions, " OR ")})
      ORDER BY days DESC
      LIMIT 20
    `);
  }

  // 지연 건수는 목록(20건 제한)과 별개로 전부 센다.
  private async queryOverdueCounts(
    segments: Prisma.Sql,
    stages: { status: string; targetDays: number }[],
  ): Promise<OverdueCountRow[]> {
    if (stages.length === 0) return [];
    const conditions = stages.map(
      (stage) =>
        Prisma.sql`(s.status = ${stage.status} AND now() - s."at" > ${`${stage.targetDays} days`}::interval)`,
    );
    return this.prisma.$queryRaw<OverdueCountRow[]>(Prisma.sql`
      SELECT s.status, count(*) AS "overdueCount"
      FROM (${segments}) s
      WHERE s."nextAt" IS NULL AND (${Prisma.join(conditions, " OR ")})
      GROUP BY s.status
    `);
  }

  private async queryRecordedSince(tenantId: string, targetType: CycleTimeTargetTypes): Promise<Date | null> {
    const row = await this.prisma.statusEvent.findFirst({
      where: { tenantId, targetType },
      orderBy: { at: "asc" },
      select: { at: true },
    });
    return row?.at ?? null;
  }

  private toStages(
    targetType: CycleTimeTargetTypes,
    rows: StageRow[],
    overdueCounts: OverdueCountRow[],
  ): CycleTimeStage[] {
    const byStatus = new Map(rows.map((row) => [row.status, row]));
    const overdueByStatus = new Map(overdueCounts.map((row) => [row.status, toNumber(row.overdueCount)]));
    return getTargetConfig(targetType).stages.map((stage): CycleTimeStage => {
      const row = byStatus.get(stage.status);
      return {
        status: stage.status,
        label: stage.label,
        targetDays: stage.targetDays,
        avgDays: roundDays(row?.avgDays ?? null),
        medianDays: roundDays(row?.medianDays ?? null),
        doneCount: toNumber(row?.doneCount ?? 0),
        openCount: toNumber(row?.openCount ?? 0),
        overdueCount: overdueByStatus.get(stage.status) ?? 0,
      };
    });
  }

  // 같은 회사 구성원만 이름을 보여 준다 — 회사를 떠난 사람 이름이 통계에 계속 남지 않게 한다.
  private async loadNames(tenantId: string, userIds: string[]): Promise<Record<string, string>> {
    const unique = Array.from(new Set(userIds));
    if (unique.length === 0) return {};
    const rows = await this.prisma.user.findMany({
      where: { id: { in: unique }, tenantMemberships: { some: { tenantId } } },
      select: { id: true, name: true },
    });
    return Object.fromEntries(rows.map((row) => [row.id, row.name]));
  }

  private async loadTargetMeta(
    targetType: CycleTimeTargetTypes,
    tenantId: string,
    targetIds: string[],
  ): Promise<Record<string, { code: string; title: string }>> {
    const unique = Array.from(new Set(targetIds));
    if (unique.length === 0) return {};
    const where = { id: { in: unique }, tenantId, deletedAt: null };
    const rows =
      targetType === "contract"
        ? await this.prisma.contract.findMany({ where, select: { id: true, code: true, title: true } })
        : await this.prisma.advice.findMany({ where, select: { id: true, code: true, title: true } });
    return Object.fromEntries(rows.map((row) => [row.id, { code: row.code ?? "-", title: row.title }]));
  }
}
