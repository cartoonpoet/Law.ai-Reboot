// 목록 조회 필터 계산(순수) — 상태 그룹 파싱, 만료 창, where 조립.
import { RpcException } from "@nestjs/microservices";
import type { Prisma } from "@prisma/client";
import type { ContractStatus, ListContractsRequest, TenantContext } from "@lawai/contracts";
import { tenantScope } from "../common/tenant-scope";
import { POST_SIGN_STATUSES, VALID_STATUSES } from "./contract-transitions";

export const EXPIRY_WINDOW_DAYS: Record<"d7" | "d30" | "d90" | "d180", number> = { d7: 7, d30: 30, d90: 90, d180: 180 };
export const DAY_MS = 86_400_000;

// "signing,signed" → ["signing","signed"]. 미지원 상태 값이 섞여 있으면 400(전체 조회로 조용히
// 새는 것을 막는다 — 잘못된 필터가 "필터 없음"처럼 동작하면 발견하기 어려운 버그가 된다).
export const parseStatusesParam = (raw: string): ContractStatus[] => {
  const values = raw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  if (values.length === 0 || values.some((v) => !VALID_STATUSES.has(v))) {
    throw new RpcException({ status: 400, message: "유효하지 않은 statuses 값입니다" });
  }
  return values as ContractStatus[];
};

// periodEnd 는 항상 "그날 00:00 UTC"로 저장된다("YYYY-MM-DD" 를 new Date() 에 넘기면 UTC 자정으로
// 파싱됨). 그런데 만료 판정 기준을 시:분:초가 계속 흐르는 현재 시각(now)으로 잡으면, 하루 안에서도
// 값이 흔들린다 — 예: KST 09:00(=UTC 00:00) 이후부터 "오늘 만료"인 계약이 조기에 expired 로
// 넘어가거나 90일 이내 창에서 빠진다. 오늘 자정(UTC)으로 고정해 하루 종일 같은 결과를 보장한다.
export const getTodayStartUtc = (): Date => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
};

// expiry → periodEnd where 절. d90/d180 은 [오늘 자정, 오늘 자정+N일], expired 는 (~, 오늘 자정).
export const parseExpiryFilter = (
  expiry: string,
): NonNullable<Prisma.ContractWhereInput["periodEnd"]> => {
  const todayStart = getTodayStartUtc();
  if (expiry === "expired") return { lt: todayStart };
  // 클라이언트 문자열로 객체를 바로 찾으면 "toString" 같은 상속 키가 걸리므로 자기 키인지 먼저 확인한다.
  if (Object.hasOwn(EXPIRY_WINDOW_DAYS, expiry)) {
    const windowDays = EXPIRY_WINDOW_DAYS[expiry as keyof typeof EXPIRY_WINDOW_DAYS];
    return {
      gte: todayStart,
      lte: new Date(todayStart.getTime() + windowDays * DAY_MS),
    };
  }
  throw new RpcException({ status: 400, message: "유효하지 않은 expiry 값입니다" });
};

// list() 검색 조건. countWhere 는 상태를 뺀 조건(그룹 탭 건수용), where 는 목록·총계용.
// status(단일)가 있으면 항상 우선한다 — statuses(그룹)는 그때 무시(기존 단일 필터 동작 보존).
export const buildListWhere = (
  req: ListContractsRequest,
  ctx: TenantContext,
): { where: Prisma.ContractWhereInput; countWhere: Prisma.ContractWhereInput } => {
  const q = req.q?.trim();
  const statusesFilter =
    !req.status && req.statuses ? parseStatusesParam(req.statuses) : undefined;
  const expiryFilter = req.expiry ? parseExpiryFilter(req.expiry) : undefined;

  // expiry 가 있으면 이미 지정된 status/statuses 와 "체결 이후 상태"의 교집합으로 좁힌다.
  // 상태 필터가 아예 없으면(전체 탭 + 만료만) POST_SIGN_STATUSES 전체가 기준이 된다.
  // 교집합이 비면(예: 검토 그룹 + 만료됨) 에러가 아니라 빈 결과(status: { in: [] }).
  const explicitStatuses = req.status ? [req.status] : statusesFilter;
  const statusFilter: ContractStatus | { in: ContractStatus[] } | undefined = req.expiry
    ? {
        in: (explicitStatuses ?? POST_SIGN_STATUSES).filter((s) =>
          POST_SIGN_STATUSES.includes(s),
        ),
      }
    : req.status
      ? req.status
      : statusesFilter
        ? { in: statusesFilter }
        : undefined;

  // 상태를 뺀 조건 — 그룹 탭 건수는 이 조건으로 센다. 만료 필터가 있으면 체결 이후 상태로만 센다.
  const countWhere: Prisma.ContractWhereInput = {
    deletedAt: null,
    ...tenantScope(ctx),
    ...(req.expiry ? { status: { in: POST_SIGN_STATUSES } } : {}),
    ...(req.party ? { party: req.party } : {}),
    ...(req.categoryId ? { categoryId: req.categoryId } : {}),
    ...(req.mineOf ? { createdById: req.mineOf } : {}),
    ...(expiryFilter ? { periodEnd: expiryFilter } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { code: { contains: q, mode: "insensitive" } },
            {
              counterparties: {
                some: {
                  company: { name: { contains: q, mode: "insensitive" } },
                },
              },
            },
          ],
        }
      : {}),
  };
  const where: Prisma.ContractWhereInput = {
    ...countWhere,
    ...(statusFilter !== undefined ? { status: statusFilter } : {}),
  };
  return { where, countWhere };
};
