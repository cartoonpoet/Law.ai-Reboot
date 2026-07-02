-- CreateEnum
CREATE TYPE "contracts"."ContractStatus" AS ENUM ('draft', 'unassigned', 'assigning', 'legalReview', 'requesterReview', 'reviewDone', 'signing', 'signed', 'fulfilling', 'closed');

-- AlterTable: status (default 적용으로 기존 행 안전)
ALTER TABLE "contracts"."Contract" ADD COLUMN "status" "contracts"."ContractStatus" NOT NULL DEFAULT 'unassigned';

-- AlterTable: code — nullable 추가 → 기존 행 백필 → NOT NULL/unique 적용
ALTER TABLE "contracts"."Contract" ADD COLUMN "code" TEXT;

WITH numbered AS (
  SELECT
    id,
    'C' || to_char("createdAt", 'YYYYMMDD') || '-' ||
      lpad(CAST(row_number() OVER (ORDER BY "createdAt", id) AS TEXT), 4, '0') AS newcode
  FROM "contracts"."Contract"
)
UPDATE "contracts"."Contract" c
SET "code" = n.newcode
FROM numbered n
WHERE c.id = n.id;

ALTER TABLE "contracts"."Contract" ALTER COLUMN "code" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Contract_code_key" ON "contracts"."Contract"("code");
