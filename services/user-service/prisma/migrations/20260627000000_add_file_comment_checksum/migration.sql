-- P3: shared.File ↔ contracts.Comment 연결 + checksum 컬럼 신설.
-- 코멘트 첨부(commentId nullable FK, cross-schema, ON DELETE CASCADE) + R2 PUT 응답 ETag 보관.
-- 기존 데이터(메타만 저장된 행)는 commentId/checksum NULL 로 안전. 순수 컬럼 추가 + 인덱스 + FK 만.

-- 컬럼 추가
ALTER TABLE "shared"."File" ADD COLUMN "commentId" TEXT;
ALTER TABLE "shared"."File" ADD COLUMN "checksum" TEXT;

-- 코멘트별 첨부 조회 인덱스
CREATE INDEX "File_commentId_idx" ON "shared"."File"("commentId");

-- cross-schema FK(shared.File.commentId → contracts.Comment.id, ON DELETE CASCADE)
ALTER TABLE "shared"."File"
  ADD CONSTRAINT "File_commentId_fkey"
  FOREIGN KEY ("commentId") REFERENCES "contracts"."Comment"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
