-- Tenant 체험판 만료 시각 (Spec 3). 기존 행은 NULL 유지(기본 테넌트는 active).
ALTER TABLE "users"."Tenant" ADD COLUMN "trialEndsAt" TIMESTAMP(3);
