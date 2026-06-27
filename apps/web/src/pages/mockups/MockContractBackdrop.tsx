import type { ReactNode } from "react";
import { Icon } from "@lawkit/ui";
import * as cd from "../contract/contractDetail.css";
import { cx } from "../contract/cx";
import * as css from "./mockups.css";

// 시안용 mock 첨부 메타. 실제 데이터 아님.
export interface MockFile {
  id: string;
  name: string;
  kind: "계약서" | "첨부" | "참고";
}

export const MOCK_FILES: MockFile[] = [
  { id: "f1", name: "IDC 입주 계약서 초안 v1.pdf", kind: "계약서" },
  { id: "f2", name: "상대수정안 (데이터센터 회신).docx", kind: "계약서" },
  { id: "f3", name: "표준양식 v2.docx", kind: "첨부" },
  { id: "f4", name: "보안 정책 첨부.pdf", kind: "첨부" },
  { id: "f5", name: "전년도 동일 계약서.pdf", kind: "참고" },
];

interface MockFileRowProps {
  file: MockFile;
  onPreview: (file: MockFile) => void;
  onCompare?: (file: MockFile) => void;
  // 시안 C 에서 사용 — 체크박스 + 선택 토글.
  selectable?: boolean;
  checked?: boolean;
  onToggle?: () => void;
}

export function MockFileRow({
  file,
  onPreview,
  onCompare,
  selectable,
  checked,
  onToggle,
}: MockFileRowProps) {
  return (
    <div className={cd.docFileRow}>
      {selectable && (
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          aria-label={`${file.name} 선택`}
        />
      )}
      <Icon name="fileText" size="sm" className={cd.fileIcon} />
      <div className={cd.docFileMain}>
        <div className={cd.docFileName}>{file.name}</div>
        <div className={cd.docFileLinks}>
          <button
            type="button"
            className={cd.flink}
            onClick={() => onPreview(file)}
          >
            미리보기
          </button>
          {onCompare && (
            <button
              type="button"
              className={cx(cd.flink, cd.flinkGreen)}
              onClick={() => onCompare(file)}
            >
              문서 비교
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface MockBackdropProps {
  variant: "A" | "B" | "C";
  onPreview: (file: MockFile) => void;
  onCompare?: (file: MockFile) => void;
  selectable?: boolean;
  selectedIds?: string[];
  onToggleSelect?: (id: string) => void;
  extraActions?: ReactNode;
}

/**
 * 시안 공용 백드롭 — 실제 ContractDetailPage 의 hero / glance / 좌-우 레일 / DocsCard 구조를
 * 그대로 미니어처로 재현한다. 시안 데모용 mock 데이터.
 */
export function MockContractBackdrop({
  variant,
  onPreview,
  onCompare,
  selectable,
  selectedIds = [],
  onToggleSelect,
  extraActions,
}: MockBackdropProps) {
  const contracts = MOCK_FILES.filter((f) => f.kind === "계약서");
  const attachs = MOCK_FILES.filter((f) => f.kind === "첨부");
  const refs = MOCK_FILES.filter((f) => f.kind === "참고");

  return (
    <div className={cd.page}>
      <a className={cd.backlink} href="/mockups">
        ← 시안 목록으로
      </a>

      <header className={cd.hero}>
        <div className={cd.heroTitleRow}>
          <h1 className={cd.heroTitle}>IDC 입주 계약 (시안 {variant})</h1>
          {extraActions}
        </div>
        <div className={cd.hmeta}>
          <span className={cd.hcode}>CTR-2026-0142</span>
          <span className={cd.sep}>·</span>
          <span>검토 중</span>
          <span className={cd.sep}>·</span>
          <span>요청자 김기획</span>
          <span className={cd.sep}>·</span>
          <span>법무 이법무</span>
        </div>
      </header>

      <div className={cd.railGrid}>
        <div className={cd.stack}>
          <section className={cd.card}>
            <header className={cd.chead}>
              <Icon name="fileText" size="sm" className={cd.cheadIconMuted} />
              계약 개요
            </header>
            <div className={cd.cbody}>
              <div className={cd.facts}>
                <div className={cd.fact}>
                  <div className={cd.fl}>상대 계약자</div>
                  <div className={cd.fv}>주식회사 데이터센터</div>
                </div>
                <div className={cd.fact}>
                  <div className={cd.fl}>계약 기간</div>
                  <div className={cd.fv}>2026-07-01 ~ 2027-06-30</div>
                </div>
                <div className={cd.fact}>
                  <div className={cd.fl}>계약 분류</div>
                  <div className={cd.fv}>임대 · IT 인프라</div>
                </div>
                <div className={cd.fact}>
                  <div className={cd.fl}>계약 언어</div>
                  <div className={cd.fv}>한국어</div>
                </div>
              </div>
            </div>
          </section>

          <section className={cd.card}>
            <header className={cd.chead}>
              <Icon name="messageSquare" size="sm" className={cd.cheadIconMuted} />
              검토 의견 (3)
            </header>
            <div className={cd.cbody}>
              <p>이법무 · 사내변호사 · 6/27 14:20</p>
              <p>
                초안과 상대 수정안 차이가 큽니다. 특히 제2조 계약기간과 제3조
                대금 조건이 변경됐어요. 좌측 문서 영역에서 비교해 보세요.
              </p>
            </div>
          </section>
        </div>

        {/* 우측 레일 (sticky) */}
        <div className={cx(cd.stack, cd.sticky)}>
          <section className={cd.card}>
            <header className={cd.chead}>
              <Icon name="paperclip" size="sm" className={cd.cheadIconMuted} />
              문서
            </header>
            <div className={cx(cd.cbody, cd.docGroup)}>
              <div>
                <div className={cd.docGroupLabel}>
                  계약서 <span className={cd.minitag}>필수</span>
                </div>
                {contracts.map((f) => (
                  <MockFileRow
                    key={f.id}
                    file={f}
                    onPreview={onPreview}
                    onCompare={variant !== "C" ? onCompare : undefined}
                    selectable={selectable}
                    checked={selectedIds.includes(f.id)}
                    onToggle={() => onToggleSelect?.(f.id)}
                  />
                ))}
              </div>
              <div>
                <div className={cd.docGroupLabel}>첨부 · 별첨</div>
                {attachs.map((f) => (
                  <MockFileRow
                    key={f.id}
                    file={f}
                    onPreview={onPreview}
                    selectable={selectable}
                    checked={selectedIds.includes(f.id)}
                    onToggle={() => onToggleSelect?.(f.id)}
                  />
                ))}
              </div>
              <div>
                <div className={cd.docGroupLabel}>참고서류</div>
                {refs.map((f) => (
                  <MockFileRow
                    key={f.id}
                    file={f}
                    onPreview={onPreview}
                    selectable={selectable}
                    checked={selectedIds.includes(f.id)}
                    onToggle={() => onToggleSelect?.(f.id)}
                  />
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>

      <div className={css.variantBadge}>
        시안 {variant} 미리보기 중 · <a href="/mockups">시안 비교</a>
      </div>
    </div>
  );
}

// === 시안 본문(미리보기·비교 콘텐츠 안에 들어갈 mock 문서) ===
export function MockOriginalDoc() {
  return (
    <>
      <div className={css.sectionHeading}>제1조 (목적)</div>
      <div>
        본 계약은 갑(주식회사 로우닷에이아이)과 을(주식회사 데이터센터)
        사이의 IDC 입주 및 운영에 관한 권리와 의무를 정함을 목적으로 한다.
      </div>

      <div className={css.sectionHeading}>제2조 (계약기간)</div>
      <span className={css.diffContext}>
        본 계약의 유효기간은 체결일로부터
      </span>
      <span className={css.diffRemove}>6개월로 한다.</span>

      <div className={css.sectionHeading}>제3조 (대금)</div>
      <span className={css.diffContext}>갑은 을에게 월</span>
      <span className={css.diffRemove}>500만원을 매월 말일까지 지급한다.</span>

      <div className={css.sectionHeading}>제4조 (보안)</div>
      <div>
        을은 갑의 자산에 대해 합리적인 보안 조치를 시행하며, 사고 발생 시 즉시
        통지한다.
      </div>
    </>
  );
}

export function MockRevisedDoc() {
  return (
    <>
      <div className={css.sectionHeading}>제1조 (목적)</div>
      <div>
        본 계약은 갑(주식회사 로우닷에이아이)과 을(주식회사 데이터센터)
        사이의 IDC 입주 및 운영에 관한 권리와 의무를 정함을 목적으로 한다.
      </div>

      <div className={css.sectionHeading}>제2조 (계약기간)</div>
      <span className={css.diffContext}>
        본 계약의 유효기간은 체결일로부터
      </span>
      <span className={css.diffAdd}>1년으로 하며, 자동 연장된다.</span>

      <div className={css.sectionHeading}>제3조 (대금)</div>
      <span className={css.diffContext}>갑은 을에게 월</span>
      <span className={css.diffAdd}>650만원을 익월 5일까지 지급한다.</span>

      <div className={css.sectionHeading}>제4조 (보안)</div>
      <div>
        을은 갑의 자산에 대해 합리적인 보안 조치를 시행하며, 사고 발생 시 즉시
        통지한다.
      </div>

      <div className={css.sectionHeading}>제5조 (배상책임) — 신규</div>
      <span className={css.diffAdd}>
        을의 과실로 인한 손해는 직전 3개월 평균 월대금의 3배를 한도로 한다.
      </span>
    </>
  );
}

export function MockDiffText() {
  return (
    <>
      <div className={css.sectionHeading}>제2조 (계약기간)</div>
      <span className={css.diffContext}>
        본 계약의 유효기간은 체결일로부터
      </span>
      <span className={css.diffRemove}>− 6개월로 한다.</span>
      <span className={css.diffAdd}>+ 1년으로 하며, 자동 연장된다.</span>

      <div className={css.sectionHeading}>제3조 (대금)</div>
      <span className={css.diffContext}>갑은 을에게 월</span>
      <span className={css.diffRemove}>
        − 500만원을 매월 말일까지 지급한다.
      </span>
      <span className={css.diffAdd}>+ 650만원을 익월 5일까지 지급한다.</span>

      <div className={css.sectionHeading}>제5조 (배상책임) — 신규</div>
      <span className={css.diffAdd}>
        + 을의 과실로 인한 손해는 직전 3개월 평균 월대금의 3배를 한도로 한다.
      </span>
    </>
  );
}
