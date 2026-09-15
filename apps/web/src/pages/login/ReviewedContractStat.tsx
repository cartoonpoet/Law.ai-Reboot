import { useEffect, useState } from "react";
import { useReviewedContractCount } from "./hooks/useReviewedContractCount";
import * as css from "./reviewedContractStat.css";

// 숫자가 목표값까지 차오르는 연출의 시작점 — 목표의 92% 에서 출발한다.
const COUNT_UP_START_RATIO = 0.92;
const COUNT_UP_STEP_MS = 55;

// 기존 로그인 패널의 카운트업 연출(타이머 기반 애니메이션이라 useEffect 예외 — 브랜드 패널에서 옮겨왔다).
const useCountUp = (target: number) => {
  const base = Math.floor(target * COUNT_UP_START_RATIO);
  const [value, setValue] = useState(base);
  useEffect(() => {
    let current = base;
    const id = setInterval(() => {
      current += Math.max(1, Math.ceil((target - current) / 7));
      if (current >= target) {
        current = target;
        clearInterval(id);
      }
      setValue(current);
    }, COUNT_UP_STEP_MS);
    return () => clearInterval(id);
  }, [target, base]);
  return value;
};

interface CountUpNumberProps {
  target: number;
}

const CountUpNumber = ({ target }: CountUpNumberProps) => {
  const value = useCountUp(target);
  return <b className={css.count}>{value.toLocaleString("ko-KR")}</b>;
};

/** 로그인 화면 "지금까지 검토된 계약 N건 · 실시간" — 실제 집계. 불러오기 전·실패하면 줄을 숨긴다. */
export const ReviewedContractStat = () => {
  const reviewedCount = useReviewedContractCount();
  if (reviewedCount === null) return null;

  return (
    <div className={`lp-rise ${css.row}`} aria-label={`지금까지 검토된 계약 ${reviewedCount.toLocaleString("ko-KR")}건`}>
      <span className={css.label}>지금까지 검토된 계약</span>
      <CountUpNumber key={reviewedCount} target={reviewedCount} />
      <span className={css.label}>건</span>
      <span className={css.live}>
        <span className={css.liveDot} />
        실시간
      </span>
    </div>
  );
};
