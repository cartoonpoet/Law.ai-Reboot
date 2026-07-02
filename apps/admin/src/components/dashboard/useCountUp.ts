import { useEffect, useState } from "react";

const easeOut = (t: number): number => 1 - Math.pow(1 - t, 3);

/**
 * 숫자 카운트업 — mount 시 0 → target 까지 rAF 로 증가(역동적 KPI).
 * 외부 시스템(애니메이션 프레임) 동기화라 useEffect 정당.
 */
export const useCountUp = (target: number, durationMs = 1200): number => {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf = 0;
    let startTs = 0;
    const tick = (ts: number) => {
      if (!startTs) startTs = ts;
      const p = Math.min(1, (ts - startTs) / durationMs);
      setValue(Math.round(easeOut(p) * target));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);
  return value;
};
