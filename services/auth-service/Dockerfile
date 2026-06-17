# 빌드 컨텍스트는 repo root. 예) docker build -f services/auth-service/Dockerfile .
FROM node:20-bookworm-slim AS build
RUN corepack enable
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm turbo build --filter=@lawai/auth-service

ENV NODE_ENV=production
ENV AUTH_SERVICE_PORT=4001
EXPOSE 4001
CMD ["node", "services/auth-service/dist/main.js"]
