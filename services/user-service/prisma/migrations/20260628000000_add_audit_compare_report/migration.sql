-- 비교 보고서 PDF 다운로드 감사 액션 추가.
-- Postgres enum 값은 추가만 가능(삭제 불가) — 안전.

ALTER TYPE "shared"."AuditAction" ADD VALUE 'compare_report_download';
