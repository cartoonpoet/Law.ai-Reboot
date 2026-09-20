import { Link } from "react-router-dom";
import * as css from "./mockups.css";

export function MockupsIndex() {
  return (
    <div className={css.indexWrap}>
      <h2 className={css.indexHero}>표준양식 관리 · 문서 편집기</h2>
      <p className={css.indexSub}>
        회사 표준 계약서 양식을 웹에서 만들고 고치는 한 흐름입니다. 양식 목록 → 편집기 → 로아이 도우미 → 버전 이력 순으로
        이어지고, 마지막 화면은 계약 작성에서 그 양식을 골라 쓰는 자리입니다.
      </p>
      <Link to="/mockups/document-editor-templates" className={css.indexCard}>
        <h3>1. 표준양식 관리 — 목록</h3>
        <p>
          계약 관리 아래 새 메뉴(법무팀 전용). 분류별로 양식을 모아 보고 현재 버전·수정일·수정자를 한 줄에 놓았습니다.
          새 양식은 빈 문서로 시작하거나 워드 파일을 올려 만듭니다.
        </p>
      </Link>
      <Link to="/mockups/document-editor-canvas" className={css.indexCard}>
        <h3>2. 문서 편집기 — 종이 캔버스</h3>
        <p>
          지금 쓰는 서식 툴바 오른쪽 끝에 표 넣기와 “로아이 도우미”를 나란히 붙였습니다. 회색 바탕 위 흰 종이가 실제 편집
          영역이고, 글을 끌어서 고르면 그 자리에 작은 버튼이 뜹니다.
        </p>
      </Link>
      <Link to="/mockups/document-editor-ai" className={css.indexCard}>
        <h3>3. 로아이 문서 도우미</h3>
        <p>
          새로 쓰기(문서 한 벌) · 문장 고치기(고른 문장만) · 전체 검토(문서 전체)로 하는 일을 갈라 놓았습니다. 검토 결과는
          위험 조항·빈칸·누락 조항으로 나눠 어디를 어떻게 고쳐야 하는지까지 적습니다.
        </p>
      </Link>
      <Link to="/mockups/document-editor-versions" className={css.indexCard}>
        <h3>4. 버전 이력 · 되돌리기</h3>
        <p>저장할 때마다 쌓인 v3·v2·v1을 수정일·수정자와 함께 보고, 옛 버전은 새 버전으로 되돌립니다.</p>
      </Link>
      <Link to="/mockups/document-editor-forms" className={css.indexCard}>
        <h3>5. 계약 작성 — 이 양식으로 작성 시작</h3>
        <p>
          계약서 검토 요청 화면에서 등록 유형 “표준계약서 계약체결”을 고르면 “표준계약서 양식 보기”가 살아나고,
          그 버튼으로 이 모달이 열립니다. 다운로드 자리가 “이 양식으로 작성 시작”으로 바뀌어 편집기로 이어집니다.
        </p>
      </Link>

      <h2 className={css.indexHero}>송무</h2>
      <Link to="/mockups/litigation-table" className={css.indexCard}>
        <h3>A. 사건 조회 — 표형</h3>
        <p>계약 조회와 같은 표에 사건번호·법원·우리 지위·상대방·심급·소가·다음 기일을 넣었습니다. 상태 탭에 건수 표시.</p>
      </Link>
      <Link to="/mockups/litigation-board" className={css.indexCard}>
        <h3>B. 사건 조회 — 기일 중심 카드형</h3>
        <p>기일이 가까운 사건이 위로. 카드 하나에 다음 기일·낼 서면·심급 진행·로아이 한 줄까지.</p>
      </Link>
      <Link to="/mockups/litigation-hearings" className={css.indexCard}>
        <h3>기일 — 달력 · 목록</h3>
        <p>같은 기일을 달력과 목록으로 전환해 봅니다. 달력의 일정을 누르면 사건 정보 팝오버.</p>
      </Link>
      <Link to="/mockups/litigation-detail" className={css.indexCard}>
        <h3>사건 상세</h3>
        <p>계약 상세와 같은 뼈대 — 요약 줄 + 사건 흐름·기일·서면 + 로아이 정리·외부 선임.</p>
      </Link>

      <h2 className={css.indexHero}>결재 대기함</h2>
      <Link to="/mockups/approval-inbox-a" className={css.indexCard}>
        <h3>A. 처리 큐형</h3>
        <p>급한 결재부터 카드로 — 핵심 정보·AI 한 줄을 보고 목록에서 바로 승인·반려, 여러 건 한꺼번에 승인.</p>
      </Link>
      <Link to="/mockups/approval-inbox-b" className={css.indexCard}>
        <h3>B. 목록 + 미리보기형</h3>
        <p>왼쪽에서 고르면 오른쪽에 내용·AI 브리핑·결재선이 열리고, 의견을 적어 그 자리에서 처리.</p>
      </Link>
      <Link to="/mockups/approval-inbox-c" className={css.indexCard}>
        <h3>C. 유형별 묶음형</h3>
        <p>체결 품의·자문 요청·자문 회신을 따로 묶어 유형마다 필요한 칸(금액·질의 요지·회신 요지)을 표로.</p>
      </Link>

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
