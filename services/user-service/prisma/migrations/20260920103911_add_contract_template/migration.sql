-- CreateEnum
CREATE TYPE "shared"."TemplateCategory" AS ENUM ('nda', 'service', 'supply', 'entrust', 'license', 'etc');

-- CreateTable
CREATE TABLE "shared"."ContractTemplate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "categoryId" "shared"."TemplateCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "currentVersionNo" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ContractTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shared"."ContractTemplateVersion" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "versionNo" INTEGER NOT NULL,
    "content" JSONB NOT NULL,
    "clauseCount" INTEGER,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractTemplateVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContractTemplate_tenantId_categoryId_idx" ON "shared"."ContractTemplate"("tenantId", "categoryId");

-- CreateIndex
CREATE INDEX "ContractTemplate_tenantId_idx" ON "shared"."ContractTemplate"("tenantId");

-- CreateIndex
CREATE INDEX "ContractTemplateVersion_templateId_idx" ON "shared"."ContractTemplateVersion"("templateId");

-- CreateIndex
CREATE UNIQUE INDEX "ContractTemplateVersion_templateId_versionNo_key" ON "shared"."ContractTemplateVersion"("templateId", "versionNo");

-- AddForeignKey
ALTER TABLE "shared"."ContractTemplateVersion" ADD CONSTRAINT "ContractTemplateVersion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "shared"."ContractTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
