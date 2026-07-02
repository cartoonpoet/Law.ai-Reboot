# 빌드 컨텍스트는 repo root. turbo prune로 의존성 레이어를 분리해 캐시/증분 pull 최적화.
FROM node:20-bookworm-slim AS base
RUN corepack enable
WORKDIR /app

FROM base AS prune
COPY . .
RUN pnpm dlx turbo@2.5.4 prune @lawai/user-service --docker

FROM base AS build
COPY --from=prune /app/out/json/ ./
RUN pnpm install --frozen-lockfile
COPY --from=prune /app/out/full/ ./
# Prisma Client 생성 후 nest 빌드
RUN pnpm --filter @lawai/user-service exec prisma generate
RUN pnpm turbo build --filter=@lawai/user-service

ENV NODE_ENV=production
ENV USER_SERVICE_PORT=4002
EXPOSE 4002
# 시작 시 마이그레이션(prisma migrate deploy) 자동 반영 후 서비스 기동
ENTRYPOINT ["sh", "/app/services/user-service/docker-entrypoint.sh"]
