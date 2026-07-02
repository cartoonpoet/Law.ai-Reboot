-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "companies";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "contracts";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "shared";

-- Move existing Company enum + table from "users" to "companies" (preserve 8 rows; indexes/constraints move with the table)
ALTER TYPE "users"."CompanyType" SET SCHEMA "companies";
ALTER TABLE "users"."Company" SET SCHEMA "companies";

-- CreateEnum
CREATE TYPE "contracts"."SecurityLevel" AS ENUM ('top', 'secure', 'normal');

-- CreateEnum
CREATE TYPE "contracts"."ReviewType" AS ENUM ('normal', 'std');

-- CreateTable
CREATE TABLE "contracts"."Contract" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "securityLevel" "contracts"."SecurityLevel" NOT NULL DEFAULT 'secure',
    "reviewType" "contracts"."ReviewType" NOT NULL DEFAULT 'normal',
    "party" TEXT,
    "catMajor" TEXT,
    "catMinor" TEXT,
    "catSub" TEXT,
    "requesterId" TEXT,
    "ownerId" TEXT,
    "createdById" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "details" JSONB NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shared"."Counterparty" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "partyType" TEXT,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Counterparty_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Contract_createdById_idx" ON "contracts"."Contract"("createdById");

-- CreateIndex
CREATE INDEX "Contract_deletedAt_idx" ON "contracts"."Contract"("deletedAt");

-- CreateIndex
CREATE INDEX "Counterparty_contractId_idx" ON "shared"."Counterparty"("contractId");

-- CreateIndex
CREATE INDEX "Counterparty_companyId_idx" ON "shared"."Counterparty"("companyId");

-- AddForeignKey
ALTER TABLE "contracts"."Contract" ADD CONSTRAINT "Contract_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared"."Counterparty" ADD CONSTRAINT "Counterparty_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"."Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared"."Counterparty" ADD CONSTRAINT "Counterparty_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"."Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
