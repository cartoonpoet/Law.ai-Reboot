-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "ai";

-- CreateTable
CREATE TABLE "ai"."AiProviderCredential" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "encryptedApiKey" TEXT NOT NULL,
    "lastVerifiedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiProviderCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai"."AiAnalysis" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "model" TEXT,
    "triggeredByUserId" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "result" JSONB,
    "errorMessage" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AiProviderCredential_userId_key" ON "ai"."AiProviderCredential"("userId");

-- CreateIndex
CREATE INDEX "AiAnalysis_tenantId_status_idx" ON "ai"."AiAnalysis"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AiAnalysis_targetType_targetId_kind_key" ON "ai"."AiAnalysis"("targetType", "targetId", "kind");
