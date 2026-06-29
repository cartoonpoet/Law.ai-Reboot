/*
  Warnings:

  - Made the column `tenantId` on table `Company` required. This step will fail if there are existing NULL values in that column.
  - Made the column `tenantId` on table `Contract` required. This step will fail if there are existing NULL values in that column.
  - Made the column `tenantId` on table `ContractCategory` required. This step will fail if there are existing NULL values in that column.
  - Made the column `tenantId` on table `AuditLog` required. This step will fail if there are existing NULL values in that column.
  - Made the column `tenantId` on table `File` required. This step will fail if there are existing NULL values in that column.
  - Made the column `tenantId` on table `Notification` required. This step will fail if there are existing NULL values in that column.
  - Made the column `tenantId` on table `Department` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "companies"."Company" ALTER COLUMN "tenantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "contracts"."Contract" ALTER COLUMN "tenantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "contracts"."ContractCategory" ALTER COLUMN "tenantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "shared"."AuditLog" ALTER COLUMN "tenantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "shared"."File" ALTER COLUMN "tenantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "shared"."Notification" ALTER COLUMN "tenantId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Department" ALTER COLUMN "tenantId" SET NOT NULL;
