# 빌드 컨텍스트는 repo root. turbo prune로 의존성 레이어를 분리해 캐시/증분 pull 최적화.
FROM node:20-bookworm-slim AS base
RUN corepack enable
WORKDIR /app

# 1) prune: 이 서비스에 필요한 package.json + 잠금파일만 추출
FROM base AS prune
COPY . .
RUN pnpm dlx turbo@2.5.4 prune @lawai/api-gateway --docker

# 2) build: 매니페스트만으로 install(코드 변경에 캐시 무효화 안 됨) → 소스 복사 → 빌드
FROM base AS build
COPY --from=prune /app/out/json/ ./
RUN pnpm install --frozen-lockfile
COPY --from=prune /app/out/full/ ./
RUN pnpm turbo build --filter=@lawai/api-gateway

ENV NODE_ENV=production
ENV GATEWAY_PORT=3000
EXPOSE 3000
CMD ["node", "services/api-gateway/dist/main.js"]
