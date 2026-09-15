// 비밀번호 규칙 — 가입·재설정·변경 공용. 영문·숫자·특수문자를 모두 포함한 8자 이상.
export const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export const PASSWORD_RULE_MESSAGE = "영문·숫자·특수문자 포함 8자 이상이어야 합니다";

// 입력하는 동안 충족 여부를 하나씩 보여주기 위한 조건 목록.
export const PASSWORD_CHECKS: { label: string; test: (value: string) => boolean }[] = [
  { label: "8자 이상", test: (value) => value.length >= 8 },
  { label: "영문", test: (value) => /[A-Za-z]/.test(value) },
  { label: "숫자", test: (value) => /\d/.test(value) },
  { label: "특수문자", test: (value) => /[^A-Za-z0-9]/.test(value) },
];
