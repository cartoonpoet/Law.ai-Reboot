import { Button, EmptyState, Icon } from "@lawkit/ui";
import type { AiReviewFinding } from "@lawai/contracts";
import { Badge } from "../ui/Badge";
import * as css from "../../pages/mockups/documentEditor/documentEditorMock.css";

interface LoaiReviewTabProps {
  /** 지금 종이에 적힌 문서 전체 검토를 (다시) 시작한다(AI 호출) — 패널이 이 탭을 열 때 한 번 호출된다. */
  onReview: () => void;
  /** 검토 결과. */
  findings: AiReviewFinding[];
  /** 검토가 진행 중인지 — 로딩 상태로 보여준다. */
  isReviewing?: boolean;
}

const countByKind = (findings: AiReviewFinding[], kind: AiReviewFinding["kind"]): number =>
  findings.filter((item) => item.kind === kind).length;

/** 로아이 ③ 초안 검토 — 위험 조항·빈칸·누락 조항을 찾아 준다. */
export const LoaiReviewTab = ({ onReview, findings, isReviewing = false }: LoaiReviewTabProps) => {
  if (isReviewing) {
    return (
      <div className={css.panelEmpty}>
        <EmptyState
          icon={<Icon name="autoAwesome" size="lg" />}
          title="로아이가 검토하는 중…"
          description="문서 전체를 읽고 위험 조항·빈칸·빠진 조항을 찾고 있습니다. 잠시만 기다려 주세요."
        />
      </div>
    );
  }

  if (findings.length === 0) {
    return (
      <div className={css.panelEmpty}>
        <EmptyState
          icon={<Icon name="search" size="lg" />}
          title="아직 검토 결과가 없습니다"
          description="아래 버튼을 눌러 지금 종이에 적힌 문서 전체를 검토해 보세요."
        />
        <Button
          variant="outline"
          color="secondary"
          iconLeft={<Icon name="search" size="sm" />}
          onClick={onReview}
        >
          지금 검토하기
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className={css.findingSummary}>
        <Badge color="danger" size="sm" dot>
          위험 조항 {countByKind(findings, "위험 조항")}
        </Badge>
        <Badge color="warning" size="sm" dot>
          빈칸 {countByKind(findings, "빈칸")}
        </Badge>
        <Badge color="info" size="sm" dot>
          누락 조항 {countByKind(findings, "누락 조항")}
        </Badge>
      </div>

      <ul className={css.findingList}>
        {findings.map((item, index) => (
          <li key={`${item.kind}-${item.where}-${index}`} className={`${css.findingBox} ${css.findingItem[item.severity]}`}>
            <span className={css.findingTop}>
              <span className={css.findingKind}>{item.kind}</span>
              <span className={css.findingWhere}>{item.where}</span>
            </span>
            <span className={css.findingTitle}>{item.title}</span>
            <span className={css.findingNote}>{item.note}</span>
          </li>
        ))}
      </ul>

      <Button variant="outline" color="secondary" iconLeft={<Icon name="refreshCw" size="sm" />} onClick={onReview}>
        고친 뒤 다시 검토하기
      </Button>

      <p className={css.disclaimer}>
        로아이 검토는 참고용이에요. 상대방에게 보내기 전에 담당 변호사가 근거를 확인하세요.
      </p>
    </>
  );
};
