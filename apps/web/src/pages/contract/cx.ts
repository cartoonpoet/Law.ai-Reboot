// 조건부 className 결합(외부 의존 없는 경량 유틸). falsy 는 무시.
export const cx = (...classes: (string | false | null | undefined)[]): string =>
  classes.filter(Boolean).join(" ");
