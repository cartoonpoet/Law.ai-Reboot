-- 코멘트 확장: 수정/소프트삭제(updatedAt/deletedAt) + 멘션(CommentMention).
-- 순수 추가(기존 Comment 컬럼/테이블 변경·삭제 없음).

-- AlterTable: Comment 에 updatedAt(@updatedAt, NOT NULL) + deletedAt(nullable) 추가.
-- updatedAt 은 @updatedAt 이라 NOT NULL → 기존 행 NULL 방지 위해 DEFAULT CURRENT_TIMESTAMP 로 추가(기존 행은 now).
ALTER TABLE "contracts"."Comment" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateIndex: 소프트삭제 조회 최적화(Contract 선례)
CREATE INDEX "Comment_deletedAt_idx" ON "contracts"."Comment"("deletedAt");

-- CreateTable: CommentMention(멘션 정규 소유)
CREATE TABLE "contracts"."CommentMention" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommentMention_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommentMention_commentId_idx" ON "contracts"."CommentMention"("commentId");

-- CreateIndex
CREATE INDEX "CommentMention_userId_idx" ON "contracts"."CommentMention"("userId");

-- CreateIndex (중복 멘션 방지)
CREATE UNIQUE INDEX "CommentMention_commentId_userId_key" ON "contracts"."CommentMention"("commentId", "userId");

-- AddForeignKey (commentId → Comment, Cascade — 하드삭제 시 멘션 정리)
ALTER TABLE "contracts"."CommentMention" ADD CONSTRAINT "CommentMention_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "contracts"."Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey (userId → users 스키마, NO ACTION — Comment.author 선례)
ALTER TABLE "contracts"."CommentMention" ADD CONSTRAINT "CommentMention_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"."User"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
