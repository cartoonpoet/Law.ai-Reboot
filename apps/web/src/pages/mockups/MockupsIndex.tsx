import { Link } from "react-router-dom";
import * as css from "./mockups.css";

export function MockupsIndex() {
  return (
    <div className={css.indexWrap}>
      <h2 className={css.indexHero}>계약 상세 진행 단계 바</h2>
      <Link to="/mockups/contract-lifecycle" className={css.indexCard}>
        <h3>D. 링 게이지 요약형 (채택)</h3>
        <p>
          실제 LifecycleRing 을 상태별로 돌려봅니다. 현재 단계가 메인이고, 지난·남은 단계는 게이지 hover 시
          Popover, 막대 hover 시 Tooltip 으로.
        </p>
      </Link>

      <h1 className={css.indexHero}>UI 시안 — 파일 미리보기 · 비교</h1>
      <p className={css.indexSub}>
        A안(모달) 확정. 미리보기는 시안 그대로 진행하고, 비교 UX 는 단계 줄인
        후보 3가지를 비교 평가합니다. 클릭 가능한 lawkit 컴포넌트 시안.
      </p>

      <h2 className={css.indexHero}>미리보기 (확정)</h2>
      <Link to="/mockups/preview-modal" className={css.indexCard}>
        <h3>A. 미리보기 모달</h3>
        <p>
          첨부 "미리보기" → lawkit Modal 단일 미리보기. 헤더 액션은 다운로드만.
          비교는 별도 시안.
        </p>
      </Link>

      <h2 className={css.indexHero}>비교 UX 후보 (선택)</h2>

      <Link to="/mockups/compare-direct" className={css.indexCard}>
        <h3>B1. 직진 — 클릭 1회로 비교 진입 (추천)</h3>
        <p>
          행의 "문서 비교" → pick 단계 0, 모달이 즉시 좌우 분할로 열림. 기본 B
          = 같은 종류의 다른 파일 자동 선정. 헤더의 dropdown 으로 B 만 빠르게
          교체. <strong>클릭 수: 1</strong>.
        </p>
      </Link>

      <Link to="/mockups/compare-swap" className={css.indexCard}>
        <h3>B2. 미리보기에서 스왑 — 한 모달 안에서 morph</h3>
        <p>
          미리보기와 비교가 같은 모달. 단일 미리보기 상태에서 헤더의 "비교: [선택
          ▾]" dropdown 으로 파일 고르면 split 으로 morph, 비우면 다시 single.
          미리보기 ↔ 비교 전환이 가장 매끄러움. <strong>클릭 수: 1</strong>{" "}
          (미리보기 모달 안에서).
        </p>
      </Link>

      <Link to="/mockups/compare-picker" className={css.indexCard}>
        <h3>B3. 비교 모드 토글 — 시각적으로 가장 명확</h3>
        <p>
          상단 "두 파일 비교 모드" 토글 ON 시 첨부 행이 체크박스 모드로 전환,
          두 개 선택되는 순간 자동 모달 진입. 클릭 수는 많지만 (3) "이 두 파일을
          비교한다" 가 가장 명확. <strong>클릭 수: 3</strong> (모드 + 파일1 +
          파일2).
        </p>
      </Link>
    </div>
  );
}
