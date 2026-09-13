# 빌드 컨텍스트는 repo root. turbo prune로 의존성 레이어를 분리해 캐시/증분 pull 최적화.
FROM node:20-bookworm-slim AS base
RUN corepack enable
WORKDIR /app

FROM base AS prune
COPY . .
RUN pnpm dlx turbo@2.5.4 prune @lawai/ai-service --docker

FROM base AS build
COPY --from=prune /app/out/json/ ./
RUN pnpm install --frozen-lockfile
COPY --from=prune /app/out/full/ ./
RUN pnpm turbo build --filter=@lawai/ai-service

ENV NODE_ENV=production
ENV AI_SERVICE_PORT=4003
EXPOSE 4003
CMD ["node", "services/ai-service/dist/main.js"]
