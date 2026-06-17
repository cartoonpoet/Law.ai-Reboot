# 빌드 컨텍스트는 repo root. 예) docker build -f services/user-service/Dockerfile .
FROM node:20-bookworm-slim AS build
RUN corepack enable
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
# Prisma Client 생성 후 nest 빌드
RUN pnpm --filter @lawai/user-service exec prisma generate
RUN pnpm turbo build --filter=@lawai/user-service

ENV NODE_ENV=production
ENV USER_SERVICE_PORT=4002
EXPOSE 4002
# 시작 시 마이그레이션(prisma migrate deploy) 자동 반영 후 서비스 기동
ENTRYPOINT ["sh", "/app/services/user-service/docker-entrypoint.sh"]
