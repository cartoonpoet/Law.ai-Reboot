#!/usr/bin/env bash
# 개발 서버 1회 초기 셋업. ubuntu 사용자로 실행.
#   curl -fsSL <raw>/deploy/bootstrap.sh | DOMAIN=lawai-reboot.kro.kr bash
# 또는 레포를 받아서: DOMAIN=lawai-reboot.kro.kr bash deploy/bootstrap.sh
set -euo pipefail

DOMAIN="${DOMAIN:-lawai-reboot.kro.kr}"
DEPLOY_DIR="${DEPLOY_DIR:-/opt/lawai}"

echo "==> Docker 설치 확인"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER"
  echo "   Docker 설치됨. (그룹 적용을 위해 재로그인이 필요할 수 있음)"
fi

echo "==> 배포 디렉터리: $DEPLOY_DIR"
sudo mkdir -p "$DEPLOY_DIR"
sudo chown -R "$USER":"$USER" "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR/deploy/certbot/conf" "$DEPLOY_DIR/deploy/certbot/www"

echo "==> .env 생성"
if [ -f "$DEPLOY_DIR/.env" ]; then
  echo "   이미 존재 — 건너뜀"
else
  gen() { openssl rand -hex 32; }
  cat > "$DEPLOY_DIR/.env" <<EOF
POSTGRES_USER=lawai
POSTGRES_PASSWORD=$(gen)
POSTGRES_DB=lawai
JWT_ACCESS_SECRET=$(gen)
JWT_REFRESH_SECRET=$(gen)
JWT_ACCESS_TTL=900s
JWT_REFRESH_TTL=7d
PASSWORD_RESET_TTL_MIN=30
APP_WEB_URL=https://$DOMAIN
EOF
  chmod 600 "$DEPLOY_DIR/.env"
  echo "   강한 시크릿으로 생성 완료"
fi

echo "==> 더미 TLS 인증서 (web nginx가 첫 기동되도록)"
CERT_DIR="$DEPLOY_DIR/deploy/certbot/conf/live/$DOMAIN"
if [ ! -f "$CERT_DIR/fullchain.pem" ]; then
  mkdir -p "$CERT_DIR"
  openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout "$CERT_DIR/privkey.pem" -out "$CERT_DIR/fullchain.pem" \
    -subj "/CN=$DOMAIN" >/dev/null 2>&1
  echo "   더미 인증서 생성 완료"
fi

echo ""
echo "부트스트랩 완료."
echo "  다음 단계:"
echo "   1) GitHub 저장소 Secrets에 SSH_HOST / SSH_USER / SSH_PRIVATE_KEY 등록"
echo "   2) dev 브랜치에 푸시 → 자동 배포(첫 배포는 더미 인증서로 기동)"
echo "   3) 첫 배포 후 실제 인증서 발급:  DOMAIN=$DOMAIN EMAIL=you@example.com bash deploy/init-letsencrypt.sh"
