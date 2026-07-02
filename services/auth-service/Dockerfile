# 빌드 컨텍스트는 repo root. turbo prune로 의존성 레이어를 분리해 캐시/증분 pull 최적화.
FROM node:20-bookworm-slim AS base
RUN corepack enable
WORKDIR /app

FROM base AS prune
COPY . .
RUN pnpm dlx turbo@2.5.4 prune @lawai/auth-service --docker

FROM base AS build
COPY --from=prune /app/out/json/ ./
RUN pnpm install --frozen-lockfile
COPY --from=prune /app/out/full/ ./
RUN pnpm turbo build --filter=@lawai/auth-service

ENV NODE_ENV=production
ENV AUTH_SERVICE_PORT=4001
EXPOSE 4001
CMD ["node", "services/auth-service/dist/main.js"]
