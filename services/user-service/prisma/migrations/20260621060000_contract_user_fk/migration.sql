-- 기존 mock requester/owner id(실 User 아님)는 FK 추가 전 NULL 백필
UPDATE "contracts"."Contract"
SET "requesterId" = NULL
WHERE "requesterId" IS NOT NULL
  AND "requesterId" NOT IN (SELECT "id" FROM "users"."User");

UPDATE "contracts"."Contract"
SET "ownerId" = NULL
WHERE "ownerId" IS NOT NULL
  AND "ownerId" NOT IN (SELECT "id" FROM "users"."User");

-- AlterTable: 작성 부서
ALTER TABLE "contracts"."Contract" ADD COLUMN "departmentId" TEXT;

-- CreateIndex
CREATE INDEX "Contract_requesterId_idx" ON "contracts"."Contract"("requesterId");
CREATE INDEX "Contract_ownerId_idx" ON "contracts"."Contract"("ownerId");
CREATE INDEX "Contract_departmentId_idx" ON "contracts"."Contract"("departmentId");

-- AddForeignKey (requester/owner/department → users 스키마)
ALTER TABLE "contracts"."Contract" ADD CONSTRAINT "Contract_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "users"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "contracts"."Contract" ADD CONSTRAINT "Contract_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "contracts"."Contract" ADD CONSTRAINT "Contract_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "users"."Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
