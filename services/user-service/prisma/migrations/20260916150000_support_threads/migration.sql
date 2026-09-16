-- CreateEnum
CREATE TYPE "shared"."SupportStatus" AS ENUM ('open', 'answered', 'closed');

-- CreateEnum
CREATE TYPE "shared"."SupportAuthorRole" AS ENUM ('user', 'admin');

-- CreateTable
CREATE TABLE "shared"."SupportThread" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" "shared"."SupportStatus" NOT NULL DEFAULT 'open',
    "context" JSONB,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shared"."SupportMessage" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorRole" "shared"."SupportAuthorRole" NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupportThread_userId_lastMessageAt_idx" ON "shared"."SupportThread"("userId", "lastMessageAt");

-- CreateIndex
CREATE INDEX "SupportThread_status_lastMessageAt_idx" ON "shared"."SupportThread"("status", "lastMessageAt");

-- CreateIndex
CREATE INDEX "SupportThread_tenantId_idx" ON "shared"."SupportThread"("tenantId");

-- CreateIndex
CREATE INDEX "SupportMessage_threadId_createdAt_idx" ON "shared"."SupportMessage"("threadId", "createdAt");

-- AddForeignKey
ALTER TABLE "shared"."SupportMessage" ADD CONSTRAINT "SupportMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "shared"."SupportThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
