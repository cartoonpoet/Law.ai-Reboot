#!/usr/bin/env bash
# PreToolUse(Bash) 훅: 코드 변경을 커밋하기 전에 프론트엔드·백엔드 코드리뷰와 필요한 수정을 먼저 하게 한다.
#
# 동작
#  - Bash 명령에 `git commit` 이 들어 있을 때만 검사한다(그 외 명령은 통과).
#  - 커밋이 이 저장소(Lawai)를 향할 때만 검사한다 — 명령 안의 `cd <경로>` 또는 훅 입력의 cwd 로 판단.
#  - 코드 폴더(apps/ services/ packages/)의 "커밋 전 변경 내용" 지문(해시)을 만든다
#    = HEAD 대비 추적 파일 diff + 아직 추적 안 된 코드 파일 내용.
#  - 리뷰를 마치고 `bash .claude/hooks/require-code-review.sh --mark` 로 기록한 지문과 같아야 커밋을 허용한다.
#    리뷰 뒤에 코드를 또 고치면 지문이 달라져 다시 리뷰를 요구한다.
#  - 코드 변경이 없는 커밋(문서·설정만)은 통과한다.
#
# 사용
#  - 훅(설정): PreToolUse matcher "Bash" 에서 인자 없이 실행 — stdin 으로 도구 입력 JSON 을 받는다.
#  - 리뷰 완료 기록: bash .claude/hooks/require-code-review.sh --mark
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/../.." && pwd -P)"
MARK_FILE="$REPO_DIR/.git/claude-code-review.ok"
CODE_PATHS=(apps services packages)

compute_fingerprint() {
  {
    git -C "$REPO_DIR" diff HEAD --binary -- "${CODE_PATHS[@]}" 2>/dev/null || true
    git -C "$REPO_DIR" ls-files --others --exclude-standard -z -- "${CODE_PATHS[@]}" 2>/dev/null \
      | while IFS= read -r -d '' file; do
          printf '%s\n' "$file"
          cat "$REPO_DIR/$file" 2>/dev/null || true
        done
  } | shasum -a 256 | cut -d' ' -f1
}

# 주어진 경로가 속한 git 저장소 최상위(없으면 빈 값).
repo_root_of() {
  local dir="$1"
  [[ -d "$dir" ]] || { printf ''; return; }
  (cd "$dir" && git rev-parse --show-toplevel 2>/dev/null && true) | head -1 | xargs -I{} sh -c 'cd "{}" && pwd -P' 2>/dev/null || printf ''
}

EMPTY_FINGERPRINT="$(printf '' | shasum -a 256 | cut -d' ' -f1)"

if [[ "${1:-}" == "--mark" ]]; then
  fingerprint="$(compute_fingerprint)"
  printf '%s\n' "$fingerprint" > "$MARK_FILE"
  echo "코드리뷰 완료로 기록했습니다 ($fingerprint). 이후 코드를 고치면 다시 리뷰가 필요합니다."
  exit 0
fi

input="$(cat)"
command="$(printf '%s' "$input" | jq -r '.tool_input.command // ""')"
if ! printf '%s' "$command" | grep -Eq '(^|[;&|[:space:]])git([[:space:]]+-C[[:space:]]+[^[:space:]]+)?[[:space:]]+commit([[:space:]]|$)'; then
  exit 0
fi

# 커밋 대상 저장소 판단: 명령의 첫 `cd <경로>` → 없으면 훅 입력의 cwd.
cwd="$(printf '%s' "$input" | jq -r '.cwd // ""')"
# (macOS 기본 sed 는 -E 에서 역참조를 지원하지 않아 따옴표는 선택으로만 건너뛴다.)
cd_target="$(printf '%s' "$command" | sed -nE 's/^[[:space:]]*cd[[:space:]]+"?([^";&[:space:]]+).*/\1/p' | head -1)"
target_dir="${cd_target:-${cwd:-$PWD}}"
if [[ "$(repo_root_of "$target_dir")" != "$REPO_DIR" ]]; then
  exit 0
fi

fingerprint="$(compute_fingerprint)"
if [[ "$fingerprint" == "$EMPTY_FINGERPRINT" ]]; then
  exit 0
fi

marked="$(cat "$MARK_FILE" 2>/dev/null || true)"
if [[ "$marked" == "$fingerprint" ]]; then
  exit 0
fi

reason="커밋 전에 코드리뷰가 필요합니다. 이번 변경(apps·services·packages)을 프론트엔드(apps/web·apps/admin: CLAUDE.md 프론트 컨벤션, 훅·상태·접근성·스타일 토큰)와 백엔드(services·packages: 권한·검증·트랜잭션·에러 처리·테스트 누락)로 나눠 리뷰하고, 발견한 문제는 고친 뒤 테스트를 다시 돌리세요. 리뷰와 수정이 끝나면 \`bash .claude/hooks/require-code-review.sh --mark\` 로 완료를 기록하고 커밋하세요. 리뷰 결과(발견·수정·보류)는 사용자에게 알려야 합니다."
jq -n --arg reason "$reason" '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$reason}}'
