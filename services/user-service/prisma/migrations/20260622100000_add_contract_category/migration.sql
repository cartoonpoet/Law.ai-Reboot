-- 계약 분류 트리(ContractCategory) 정규화.
-- 순서 엄수: (1) 테이블 생성 → (2) 시드 INSERT(멱등) → (3) Contract 컬럼 추가/FK → (4) 백필 UPDATE(DROP 이전) → (5) cat3 DROP.
-- slug 규칙: 계층 경로 dot-notation 영문(대 `dev-supply`, 중 `dev-supply.software`, 소 `dev-supply.software.saas`). 전역 unique.

-- 1) CreateTable
CREATE TABLE "contracts"."ContractCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "parentId" TEXT,
    "sortOrder" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContractCategory_slug_key" ON "contracts"."ContractCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ContractCategory_parentId_name_key" ON "contracts"."ContractCategory"("parentId", "name");

-- CreateIndex
CREATE INDEX "ContractCategory_parentId_idx" ON "contracts"."ContractCategory"("parentId");

-- AddForeignKey (self-reference, SET NULL)
ALTER TABLE "contracts"."ContractCategory" ADD CONSTRAINT "ContractCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "contracts"."ContractCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 2) 시드 INSERT (멱등: slug 기준 WHERE NOT EXISTS). 루트→중→소 순서로 parentId 를 부모 slug 서브쿼리 참조.
-- CATEGORY_TREE 전체 이관 (apps/web/src/pages/contract/contractOptions.ts).

-- 2-1) 대분류(루트, parentId NULL)
INSERT INTO "contracts"."ContractCategory" ("id", "name", "slug", "parentId", "sortOrder", "createdAt")
SELECT gen_random_uuid(), c.name, c.slug, NULL, c."sortOrder", CURRENT_TIMESTAMP
FROM (VALUES
  ('개발/공급', 'dev-supply', 0),
  ('구매',      'purchase',   1),
  ('자문',      'advisory',   2),
  ('기타',      'etc',        3)
) AS c(name, slug, "sortOrder")
WHERE NOT EXISTS (
  SELECT 1 FROM "contracts"."ContractCategory" e WHERE e.slug = c.slug
);

-- 2-2) 중분류 (부모 = 대분류 slug)
INSERT INTO "contracts"."ContractCategory" ("id", "name", "slug", "parentId", "sortOrder", "createdAt")
SELECT gen_random_uuid(), c.name, c.slug, p.id, c."sortOrder", CURRENT_TIMESTAMP
FROM (VALUES
  ('소프트웨어',  'dev-supply.software',     'dev-supply', 0),
  ('용역',        'dev-supply.service',      'dev-supply', 1),
  ('물품',        'purchase.goods',          'purchase',   0),
  ('위탁',        'purchase.consignment',    'purchase',   1),
  ('법률',        'advisory.legal',          'advisory',   0),
  ('세무/회계',   'advisory.tax-accounting', 'advisory',   1),
  ('기타',        'etc.etc',                 'etc',        0)
) AS c(name, slug, "parentSlug", "sortOrder")
JOIN "contracts"."ContractCategory" p ON p.slug = c."parentSlug"
WHERE NOT EXISTS (
  SELECT 1 FROM "contracts"."ContractCategory" e WHERE e.slug = c.slug
);

-- 2-3) 소분류 (부모 = 중분류 slug)
INSERT INTO "contracts"."ContractCategory" ("id", "name", "slug", "parentId", "sortOrder", "createdAt")
SELECT gen_random_uuid(), c.name, c.slug, p.id, c."sortOrder", CURRENT_TIMESTAMP
FROM (VALUES
  ('SaaS 이용',  'dev-supply.software.saas',        'dev-supply.software',     0),
  ('라이선스',   'dev-supply.software.license',     'dev-supply.software',     1),
  ('구축/SI',    'dev-supply.software.si',          'dev-supply.software',     2),
  ('개발용역',   'dev-supply.service.dev',          'dev-supply.service',      0),
  ('유지보수',   'dev-supply.service.maintenance',  'dev-supply.service',      1),
  ('기술지원',   'dev-supply.service.support',      'dev-supply.service',      2),
  ('사무용품',   'purchase.goods.office',           'purchase.goods',          0),
  ('IT 장비',    'purchase.goods.it-equipment',     'purchase.goods',          1),
  ('원자재',     'purchase.goods.raw-material',     'purchase.goods',          2),
  ('제조위탁',   'purchase.consignment.manufacturing', 'purchase.consignment', 0),
  ('운영위탁',   'purchase.consignment.operation',  'purchase.consignment',    1),
  ('일반자문',   'advisory.legal.general',          'advisory.legal',          0),
  ('계약검토',   'advisory.legal.contract-review',  'advisory.legal',          1),
  ('소송대리',   'advisory.legal.litigation',       'advisory.legal',          2),
  ('기장대리',   'advisory.tax-accounting.bookkeeping', 'advisory.tax-accounting', 0),
  ('세무신고',   'advisory.tax-accounting.tax-filing',  'advisory.tax-accounting', 1),
  ('기타',       'etc.etc.etc',                     'etc.etc',                 0)
) AS c(name, slug, "parentSlug", "sortOrder")
JOIN "contracts"."ContractCategory" p ON p.slug = c."parentSlug"
WHERE NOT EXISTS (
  SELECT 1 FROM "contracts"."ContractCategory" e WHERE e.slug = c.slug
);

-- 3) Contract 분류 컬럼 추가 (categoryId/categoryLabel) + FK + index. cat3 는 아직 존재(백필에서 참조).
ALTER TABLE "contracts"."Contract" ADD COLUMN "categoryId" TEXT,
ADD COLUMN "categoryLabel" TEXT;

-- AddForeignKey (categoryId → ContractCategory, SET NULL)
ALTER TABLE "contracts"."Contract" ADD CONSTRAINT "Contract_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "contracts"."ContractCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Contract_categoryId_idx" ON "contracts"."Contract"("categoryId");

-- 4) 백필 (DROP 이전): 기존 catMajor/catMinor/catSub 를 시드 트리(소=catSub, 중=부모 catMinor, 대=조부모 catMajor)에 조인해 categoryId 매칭.
--    매칭 성공 행은 categoryId + categoryLabel(전체 경로). 빈 테이블이면 자연히 no-op.
UPDATE "contracts"."Contract" c
SET "categoryId" = sub.id,
    "categoryLabel" = c."catMajor" || ' > ' || c."catMinor" || ' > ' || c."catSub"
FROM "contracts"."ContractCategory" sub
JOIN "contracts"."ContractCategory" mid ON mid.id = sub."parentId"
JOIN "contracts"."ContractCategory" maj ON maj.id = mid."parentId"
WHERE sub.name = c."catSub"
  AND mid.name = c."catMinor"
  AND maj.name = c."catMajor"
  AND maj."parentId" IS NULL
  AND c."catSub" IS NOT NULL
  AND c."catMinor" IS NOT NULL
  AND c."catMajor" IS NOT NULL;

-- 4-2) 매칭 실패(또는 부분 입력) 행: categoryId 는 NULL 유지하되 categoryLabel 에 가능한 조합을 보존(무손실).
UPDATE "contracts"."Contract" c
SET "categoryLabel" = NULLIF(
      concat_ws(' > ', NULLIF(c."catMajor", ''), NULLIF(c."catMinor", ''), NULLIF(c."catSub", '')),
      ''
    )
WHERE c."categoryId" IS NULL
  AND (c."catMajor" IS NOT NULL OR c."catMinor" IS NOT NULL OR c."catSub" IS NOT NULL);

-- 5) cat3 DROP (백필 완료 후)
ALTER TABLE "contracts"."Contract" DROP COLUMN "catMajor",
DROP COLUMN "catMinor",
DROP COLUMN "catSub";
