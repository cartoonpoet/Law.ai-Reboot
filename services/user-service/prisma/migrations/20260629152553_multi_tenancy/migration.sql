/*
  Warnings:

  - You are about to drop the column `role` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[tenantId,bizNo]` on the table `Company` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tenantId,name]` on the table `Department` will be added. If there are existing duplicate values, this will fail.

*/

-- Step 1: 새 Enum 타입 생성
-- CreateEnum
CREATE TYPE "TenantPlan" AS ENUM ('enterprise', 'pro', 'starter');

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('active', 'trial', 'suspended');

-- CreateEnum
CREATE TYPE "TenantRole" AS ENUM ('general', 'contractManager', 'inHouseCounsel', 'outsideCounsel', 'sealManager');

-- Step 2: Tenant / UserTenant 테이블 생성 (백필 전에 필요)
-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "plan" "TenantPlan" NOT NULL DEFAULT 'starter',
    "status" "TenantStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserTenant" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "role" "TenantRole" NOT NULL DEFAULT 'general',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserTenant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserTenant_userId_idx" ON "UserTenant"("userId");

-- CreateIndex
CREATE INDEX "UserTenant_tenantId_idx" ON "UserTenant"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "UserTenant_userId_tenantId_key" ON "UserTenant"("userId", "tenantId");

-- Step 3: 기존 unique 인덱스 제거
-- DropForeignKey (User 참조 FK 먼저 제거)
ALTER TABLE "contracts"."Comment" DROP CONSTRAINT "Comment_authorId_fkey";

-- DropForeignKey
ALTER TABLE "contracts"."CommentMention" DROP CONSTRAINT "CommentMention_userId_fkey";

-- DropIndex
DROP INDEX "companies"."Company_bizNo_key";

-- DropIndex
DROP INDEX "Department_name_key";

-- Step 4: tenantId 컬럼 추가 (nullable) + isSystemAdmin 추가 (role 은 아직 유지)
-- AlterTable
ALTER TABLE "companies"."Company" ADD COLUMN     "tenantId" TEXT;

-- AlterTable
ALTER TABLE "contracts"."Comment" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "contracts"."Contract" ADD COLUMN     "tenantId" TEXT;

-- AlterTable
ALTER TABLE "contracts"."ContractCategory" ADD COLUMN     "tenantId" TEXT;

-- AlterTable
ALTER TABLE "shared"."AuditLog" ADD COLUMN     "tenantId" TEXT;

-- AlterTable
ALTER TABLE "shared"."File" ADD COLUMN     "tenantId" TEXT;

-- AlterTable
ALTER TABLE "shared"."Notification" ADD COLUMN     "tenantId" TEXT;

-- AlterTable
ALTER TABLE "Department" ADD COLUMN     "tenantId" TEXT;

-- AlterTable: isSystemAdmin 추가 (role 컬럼은 백필 후에 DROP)
ALTER TABLE "User" ADD COLUMN     "isSystemAdmin" BOOLEAN NOT NULL DEFAULT false;

-- Step 5: tenantId 인덱스 추가
-- CreateIndex
CREATE INDEX "Company_tenantId_idx" ON "companies"."Company"("tenantId");

-- CreateIndex
CREATE INDEX "Contract_tenantId_idx" ON "contracts"."Contract"("tenantId");

-- CreateIndex
CREATE INDEX "ContractCategory_tenantId_idx" ON "contracts"."ContractCategory"("tenantId");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_idx" ON "shared"."AuditLog"("tenantId");

-- CreateIndex
CREATE INDEX "File_tenantId_idx" ON "shared"."File"("tenantId");

-- CreateIndex
CREATE INDEX "Notification_tenantId_idx" ON "shared"."Notification"("tenantId");

-- CreateIndex
CREATE INDEX "Department_tenantId_idx" ON "Department"("tenantId");

-- Step 6: 데이터 백필 (기존 단일 조직 → 기본 테넌트)
-- Tenant 생성
INSERT INTO "Tenant" (id, name, plan, status, "createdAt")
VALUES ('00000000-0000-0000-0000-000000000001', '기본 조직', 'enterprise', 'active', now());

-- 루트 엔티티 백필
UPDATE "contracts"."Contract"         SET "tenantId" = '00000000-0000-0000-0000-000000000001' WHERE "tenantId" IS NULL;
UPDATE "companies"."Company"          SET "tenantId" = '00000000-0000-0000-0000-000000000001' WHERE "tenantId" IS NULL;
UPDATE "contracts"."ContractCategory" SET "tenantId" = '00000000-0000-0000-0000-000000000001' WHERE "tenantId" IS NULL;
UPDATE "Department"                   SET "tenantId" = '00000000-0000-0000-0000-000000000001' WHERE "tenantId" IS NULL;
UPDATE "shared"."AuditLog"            SET "tenantId" = '00000000-0000-0000-0000-000000000001' WHERE "tenantId" IS NULL;
UPDATE "shared"."Notification"        SET "tenantId" = '00000000-0000-0000-0000-000000000001' WHERE "tenantId" IS NULL;

-- File.tenantId 는 부모 Contract 에서 복사
UPDATE "shared"."File" f SET "tenantId" = c."tenantId"
  FROM "contracts"."Contract" c WHERE f."contractId" = c.id AND f."tenantId" IS NULL;

-- 기존 User.role → UserTenant 멤버십 (role 컬럼 DROP 전에 읽음)
-- Role → text → TenantRole 으로 2단계 캐스팅 (PostgreSQL 커스텀 enum 간 직접 캐스트 불가)
INSERT INTO "UserTenant" (id, "userId", "tenantId", role, "joinedAt")
SELECT gen_random_uuid(), u.id, '00000000-0000-0000-0000-000000000001',
       (CASE WHEN u.role::text = 'admin' THEN 'general' ELSE u.role::text END)::"TenantRole",
       now()
FROM "User" u;

-- admin 사용자 isSystemAdmin 승격
UPDATE "User" SET "isSystemAdmin" = true WHERE role::text = 'admin';

-- Step 7: User.role DROP + Role enum DROP (백필 완료 후)
-- AlterTable
ALTER TABLE "User" DROP COLUMN "role";

-- DropEnum
DROP TYPE "Role";

-- Step 8: unique 재설계 (백필로 tenantId 채워진 뒤)
-- CreateIndex
CREATE UNIQUE INDEX "Company_tenantId_bizNo_key" ON "companies"."Company"("tenantId", "bizNo");

-- CreateIndex
CREATE UNIQUE INDEX "Department_tenantId_name_key" ON "Department"("tenantId", "name");

-- Step 9: FK 재연결 (User 테이블 변경 완료 후)
-- AddForeignKey
ALTER TABLE "UserTenant" ADD CONSTRAINT "UserTenant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTenant" ADD CONSTRAINT "UserTenant_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts"."Comment" ADD CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts"."CommentMention" ADD CONSTRAINT "CommentMention_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
