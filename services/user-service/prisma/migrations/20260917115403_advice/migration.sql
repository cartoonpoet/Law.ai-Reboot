-- CreateEnum
CREATE TYPE "contracts"."AdviceStatus" AS ENUM ('received', 'reviewing', 'waitingRequester', 'answered', 'closed');

-- CreateEnum
CREATE TYPE "contracts"."AdviceRegion" AS ENUM ('domestic', 'overseas', 'both');

-- CreateEnum
CREATE TYPE "contracts"."AdviceMessageKind" AS ENUM ('followup', 'reply', 'answer');

-- CreateTable
CREATE TABLE "contracts"."Advice" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "contracts"."AdviceStatus" NOT NULL DEFAULT 'received',
    "securityLevel" "contracts"."SecurityLevel" NOT NULL DEFAULT 'secure',
    "categories" TEXT[],
    "region" "contracts"."AdviceRegion" NOT NULL DEFAULT 'domestic',
    "countries" TEXT[],
    "requesterId" TEXT NOT NULL,
    "ownerId" TEXT,
    "createdById" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "background" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "etcRequest" TEXT,
    "dueDate" TIMESTAMP(3),
    "details" JSONB NOT NULL,
    "answeredAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Advice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts"."AdviceMessage" (
    "id" TEXT NOT NULL,
    "adviceId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "kind" "contracts"."AdviceMessageKind" NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdviceMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Advice_code_key" ON "contracts"."Advice"("code");

-- CreateIndex
CREATE INDEX "Advice_tenantId_status_idx" ON "contracts"."Advice"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Advice_requesterId_idx" ON "contracts"."Advice"("requesterId");

-- CreateIndex
CREATE INDEX "Advice_ownerId_idx" ON "contracts"."Advice"("ownerId");

-- CreateIndex
CREATE INDEX "Advice_createdById_idx" ON "contracts"."Advice"("createdById");

-- CreateIndex
CREATE INDEX "AdviceMessage_adviceId_createdAt_idx" ON "contracts"."AdviceMessage"("adviceId", "createdAt");

-- AddForeignKey
ALTER TABLE "contracts"."AdviceMessage" ADD CONSTRAINT "AdviceMessage_adviceId_fkey" FOREIGN KEY ("adviceId") REFERENCES "contracts"."Advice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
