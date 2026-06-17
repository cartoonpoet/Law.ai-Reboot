#!/usr/bin/env bash
# 첫 배포(web 컨테이너가 :80에서 동작) 이후 1회 실행 — 실제 Let's Encrypt 인증서 발급.
#   DOMAIN=lawai-reboot.kro.kr EMAIL=you@example.com bash deploy/init-letsencrypt.sh
set -euo pipefail

DOMAIN="${DOMAIN:-lawai-reboot.kro.kr}"
EMAIL="${EMAIL:?EMAIL=you@example.com 형태로 이메일을 지정하세요}"
DEPLOY_DIR="${DEPLOY_DIR:-/opt/lawai}"
COMPOSE="docker compose -f docker-compose.prod.yml"

cd "$DEPLOY_DIR"

echo "==> 더미 인증서 제거"
rm -rf "deploy/certbot/conf/live/$DOMAIN" \
       "deploy/certbot/conf/archive/$DOMAIN" \
       "deploy/certbot/conf/renewal/$DOMAIN.conf"

echo "==> Let's Encrypt 인증서 발급 (webroot)"
$COMPOSE run --rm --entrypoint "certbot certonly --webroot -w /var/www/certbot \
  -d $DOMAIN --email $EMAIL --agree-tos --no-eff-email --non-interactive" certbot

echo "==> nginx reload"
$COMPOSE exec web nginx -s reload || $COMPOSE restart web

echo "완료 — https://$DOMAIN 확인"
