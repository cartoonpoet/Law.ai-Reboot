import * as css from "../settings.css";

interface ReadOnlyFieldProps {
  label: string;
  value: string;
  // 왜 바꿀 수 없는지(예: 변경 불가, 관리자가 지정)
  note: string;
}

/** 보기만 하는 값 — 이메일·부서처럼 여기서 바꾸지 않는 항목. */
export const ReadOnlyField = ({ label, value, note }: ReadOnlyFieldProps) => (
  <div className={css.field}>
    <span className={css.label}>{label}</span>
    <div className={css.readOnlyBox}>
      <span>{value}</span>
      <span className={css.readOnlyNote}>{note}</span>
    </div>
  </div>
);
