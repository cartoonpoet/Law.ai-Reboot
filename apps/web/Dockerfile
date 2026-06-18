# 빌드 컨텍스트는 repo root. turbo prune로 의존성 레이어 분리 + nginx 멀티스테이지.
FROM node:20-bookworm-slim AS base
RUN corepack enable
WORKDIR /app

FROM base AS prune
COPY . .
RUN pnpm dlx turbo@2.5.4 prune @lawai/web --docker

FROM base AS build
COPY --from=prune /app/out/json/ ./
RUN pnpm install --frozen-lockfile
COPY --from=prune /app/out/full/ ./
# 프론트는 같은 도메인의 /api 로 백엔드를 호출(nginx가 게이트웨이로 프록시)
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN pnpm turbo build --filter=@lawai/web

FROM nginx:1.27-alpine AS run
RUN rm -f /etc/nginx/conf.d/default.conf
COPY apps/web/nginx.conf /etc/nginx/conf.d/app.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80 443
