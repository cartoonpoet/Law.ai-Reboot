import { Button } from "@lawkit/ui";
import { cx } from "../cx";
import { describeRenewalTerms, type RenewalTermsStateTypes } from "./renewalTerms";
import * as css from "./expiringContracts.css";

interface RenewalTermsCellProps {
  state: RenewalTermsStateTypes;
  isSending: boolean;
  now: Date;
  onRead: () => void;
}

/** 만료 관리 표의 "AI 판단" 칸 — 자동갱신·통지 기한, 읽는 중, 또는 "AI로 읽기" 버튼. */
export const RenewalTermsCell = ({ state, isSending, now, onRead }: RenewalTermsCellProps) => {
  if (state.status === "done") {
    const { headline, tone } = describeRenewalTerms(state.terms, now);
    return (
      <div className={css.stack}>
        <span className={cx(css.aiHeadline, css.aiTone[tone])}>{headline}</span>
        {state.terms.clause && <span className={css.sub}>{state.terms.clause}</span>}
      </div>
    );
  }
  if (state.status === "reading") {
    return <span className={css.sub}>AI가 계약서를 읽고 있어요…</span>;
  }
  return (
    <div className={css.stack}>
      {state.status === "unavailable" && <span className={css.sub}>{state.reason}</span>}
      <Button type="button" size="small" variant="outline" color="secondary" disabled={isSending} onClick={onRead}>
        {state.status === "none" ? "AI로 읽기" : "다시 읽기"}
      </Button>
    </div>
  );
};
