# admin 정적 SPA — apps/web Dockerfile 패턴 미러.
# 컨테이너는 외부 포트 노출 X — web 컨테이너의 nginx 가 admin.lawai-reboot.kro.kr 트래픽을
# 내부 네트워크로 proxy_pass 한다.
FROM node:20-bookworm-slim AS base
RUN corepack enable
WORKDIR /app

FROM base AS prune
COPY . .
RUN pnpm dlx turbo@2.5.4 prune @lawai/admin --docker

FROM base AS build
COPY --from=prune /app/out/json/ ./
RUN pnpm install --frozen-lockfile
COPY --from=prune /app/out/full/ ./
# admin 도 같은 도메인(admin.lawai-reboot.kro.kr)의 /api 로 백엔드 호출 — web nginx 가 같은 api-gateway 로 프록시.
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN pnpm turbo build --filter=@lawai/admin

FROM nginx:1.27-alpine AS run
RUN rm -f /etc/nginx/conf.d/default.conf
COPY apps/admin/nginx.conf /etc/nginx/conf.d/app.conf
COPY --from=build /app/apps/admin/dist /usr/share/nginx/html
EXPOSE 80
