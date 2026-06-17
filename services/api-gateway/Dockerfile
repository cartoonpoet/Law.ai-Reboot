# 빌드 컨텍스트는 repo root (pnpm 워크스페이스 전체). 예) docker build -f services/api-gateway/Dockerfile .
FROM node:20-bookworm-slim AS build
RUN corepack enable
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
# turbo가 ^build 의존성(@lawai/contracts)을 먼저 빌드한다
RUN pnpm turbo build --filter=@lawai/api-gateway

ENV NODE_ENV=production
ENV GATEWAY_PORT=3000
EXPOSE 3000
CMD ["node", "services/api-gateway/dist/main.js"]
