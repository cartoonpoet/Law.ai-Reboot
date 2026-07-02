-- CreateEnum
CREATE TYPE "shared"."AuditAction" AS ENUM ('create', 'update', 'delete', 'transition', 'view');

-- CreateTable
CREATE TABLE "shared"."AuditLog" (
    "id" TEXT NOT NULL,
    "action" "shared"."AuditAction" NOT NULL,
    "actorId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "detail" JSONB,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_targetType_targetId_idx" ON "shared"."AuditLog"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "shared"."AuditLog"("actorId");
