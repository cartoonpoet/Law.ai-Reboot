-- User.emailNotify: 멘션 이메일 알림 수신 여부(기본 on). 멀티스키마 한정자("users"."User").
-- 순수 추가(기존 테이블/컬럼 변경·삭제 없음).

-- AlterTable
ALTER TABLE "users"."User" ADD COLUMN "emailNotify" BOOLEAN NOT NULL DEFAULT true;
