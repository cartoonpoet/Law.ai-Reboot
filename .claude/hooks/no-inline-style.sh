#!/usr/bin/env bash
# PreToolUse(Edit|Write) 훅: apps/web 프론트엔드(.tsx/.jsx)에 인라인 style={{ ... }} 추가를 차단한다.
# 스타일은 무조건 vanilla-extract + 디자인 토큰(themeVars)으로 작성한다 (CLAUDE.md Style 규칙).
# 차단 대상: 편집/작성으로 들어오는 새 내용(new_string / content)에 `style={{` 가 포함된 경우.
#  - .css.ts 의 style({...}) 호출은 `style={{` 패턴이 아니므로 영향 없음.
#  - 기존 인라인 스타일을 건드리지 않는 편집(new_string 에 style={{ 없음)은 통과.
jq -c '
  (.tool_input.file_path // "") as $f |
  (.tool_input.new_string // .tool_input.content // "") as $c |
  if ($f | test("apps/web/.*\\.(tsx|jsx)$")) and ($c | test("style=\\{\\{"))
  then {hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:"인라인 style 금지(apps/web): vanilla-extract(*.css.ts) + 디자인 토큰(themeVars)을 사용하세요. CLAUDE.md Style 규칙."}}
  else empty end
'
