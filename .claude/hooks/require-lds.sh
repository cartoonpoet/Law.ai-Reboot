#!/usr/bin/env bash
# PreToolUse(Edit|Write) 훅: 프론트엔드 화면(apps/web · apps/admin 의 .tsx/.jsx)에서
# LDS(@lawkit/ui)에 이미 있는 UI 를 날 HTML 태그로 새로 만드는 것을 차단한다.
#
# 규칙(CLAUDE.md): 화면은 무조건 LDS 컴포넌트로 구성한다. 표·버튼·입력·선택·모달·진행바 등을
# 손으로 만들지 말고 @lawkit/ui 의 것을 쓴다. 쓸 컴포넌트와 props 는
# apps/web/node_modules/@lawkit/ui/CLAUDE.md 에 있다.
#
# 차단 대상: 새로 들어오는 내용(new_string / content)에 아래 여는 태그가 있는 경우.
#   <table  <thead  <tbody  <button  <input  <select  <option  <textarea  <dialog  <progress  <details  <summary
# 통과시키는 경우:
#   - 같은 내용 안에 `lds-exempt` 주석이 있으면 통과(사용자에게 사유를 설명하고 승인받은 뒤에만 쓴다).
#   - .css.ts · 테스트 파일(.test.tsx) · node_modules 는 대상이 아니다.
#   - 기존 코드를 그대로 두는 편집(새 내용에 해당 태그가 없음)은 통과.
jq -c '
  (.tool_input.file_path // "") as $f |
  (.tool_input.new_string // .tool_input.content // "") as $c |
  ($c | test("lds-exempt")) as $exempt |
  ($c | capture("<(?<tag>table|thead|tbody|button|input|select|option|textarea|dialog|progress|details|summary)(\\s|>|/)") ) as $hit |
  if ($f | test("apps/(web|admin)/src/.*\\.(tsx|jsx)$"))
     and ($f | test("\\.test\\.(tsx|jsx)$") | not)
     and ($exempt | not)
     and ($hit != null)
  then
    ($hit.tag) as $tag |
    ({
      table: "DataTable",
      thead: "DataTable",
      tbody: "DataTable",
      button: "Button / IconButtonGroup",
      input: "Input / NumberInput / Checkbox / Radio / DatePicker",
      select: "Dropdown / TagSelect",
      option: "Dropdown / TagSelect",
      textarea: "Textarea",
      dialog: "Modal / Drawer / FloatingModal",
      progress: "Progress / ProgressBar",
      details: "Collapse",
      summary: "Collapse"
    }[$tag]) as $lds |
    {hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:("LDS 사용 필수: <" + $tag + "> 를 직접 만들지 말고 @lawkit/ui 의 " + $lds + " 를 쓰세요. 쓸 컴포넌트와 props 는 apps/web/node_modules/@lawkit/ui/CLAUDE.md 에 있습니다. LDS 로 못 만드는 경우라면 사용자에게 사유를 설명하고 승인받은 뒤 그 줄에 `lds-exempt: <사유>` 주석을 답니다.")}}
  else empty end
'
