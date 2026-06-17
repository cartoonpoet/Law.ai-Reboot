#!/bin/sh
# user-service 컨테이너 시작 스크립트.
# DB 스키마 변경분을 자동 반영(prisma migrate deploy)한 뒤 서비스를 기동한다.
set -e

echo "[user-service] applying migrations (prisma migrate deploy)..."
cd /app/services/user-service
pnpm exec prisma migrate deploy --schema=prisma/schema.prisma

echo "[user-service] starting..."
exec node dist/main.js
