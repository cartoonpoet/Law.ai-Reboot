-- 상태가 바뀐 시각 기록(업무 통계용).
CREATE TABLE "shared"."StatusEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "ownerId" TEXT,
    "actorId" TEXT,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StatusEvent_pkey" PRIMARY KEY ("id")
);

-- 집계는 (tenantId, targetType) 으로 좁힌 뒤 대상별로 시간순 정렬해 구간을 잰다 — 그 순서 그대로 둔다.
CREATE INDEX "StatusEvent_tenantId_targetType_targetId_at_idx" ON "shared"."StatusEvent"("tenantId", "targetType", "targetId", "at");

-- ── 기존 데이터 백필 ────────────────────────────────────────────────
-- 지금까지는 상태 전이가 AuditLog 에만 남았고 그나마 from/to 를 적은 것만 있다.
-- 있는 만큼만 끌어와 "기록 시작 이후" 통계의 출발점을 만든다(화면에 그 기준을 밝힌다).

-- 1) 만들어진 시점 = 첫 상태 진입
INSERT INTO "shared"."StatusEvent" ("id", "tenantId", "targetType", "targetId", "fromStatus", "toStatus", "ownerId", "actorId", "at")
SELECT gen_random_uuid()::text, c."tenantId", 'contract', c."id", NULL, 'unassigned', c."ownerId", c."createdById", c."createdAt"
FROM "contracts"."Contract" c
WHERE c."deletedAt" IS NULL;

-- 자문의 첫 상태는 만들 때 결재선이 있었는지·담당이 정해져 있었는지에 따라 셋 중 하나다
-- (AdvicesService.create 와 같은 기준). 전부 received 로 박으면 결재를 거친 자문의 "배정 대기" 가 부풀려진다.
INSERT INTO "shared"."StatusEvent" ("id", "tenantId", "targetType", "targetId", "fromStatus", "toStatus", "ownerId", "actorId", "at")
SELECT
    gen_random_uuid()::text,
    a."tenantId",
    'advice',
    a."id",
    NULL,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM "shared"."ApprovalLine" al
            WHERE al."targetId" = a."id" AND al."targetType" = 'advice_request' AND al."tenantId" = a."tenantId"
        ) THEN 'requestApproval'
        WHEN a."ownerId" IS NOT NULL THEN 'reviewing'
        ELSE 'received'
    END,
    a."ownerId",
    a."createdById",
    a."createdAt"
FROM "contracts"."Advice" a
WHERE a."deletedAt" IS NULL;

-- 2) 감사 로그에 남은 전이(to 가 있는 것만).
--    ownerId 는 "지금" 담당자다 — 그때의 담당자는 알 수 없다. 담당자별 통계는 재배정에 소급 적용된다는 뜻이고,
--    화면에도 "기록 시작 이후" 기준임을 밝힌다.
INSERT INTO "shared"."StatusEvent" ("id", "tenantId", "targetType", "targetId", "fromStatus", "toStatus", "ownerId", "actorId", "at")
SELECT
    gen_random_uuid()::text,
    l."tenantId",
    'contract',
    l."targetId",
    l."detail" ->> 'from',
    l."detail" ->> 'to',
    c."ownerId",
    l."actorId",
    l."at"
FROM "shared"."AuditLog" l
JOIN "contracts"."Contract" c ON c."id" = l."targetId" AND c."tenantId" = l."tenantId"
WHERE l."action" = 'transition'
  AND l."targetType" = 'Contract'
  AND l."detail" ->> 'to' IS NOT NULL
  AND c."deletedAt" IS NULL;
