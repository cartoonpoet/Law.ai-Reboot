-- 폴리모픽 인앱 알림(Notification). AuditLog 선례 동일 — DB FK 없음(앱 레벨 무결성), shared 스키마.
-- 순수 추가(기존 테이블/컬럼 변경·삭제 없음).

-- CreateTable
CREATE TABLE "shared"."Notification" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "detail" JSONB,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (안읽음 카운트 조회)
CREATE INDEX "Notification_recipientId_readAt_idx" ON "shared"."Notification"("recipientId", "readAt");

-- CreateIndex (수신자 목록 정렬)
CREATE INDEX "Notification_recipientId_createdAt_idx" ON "shared"."Notification"("recipientId", "createdAt");
