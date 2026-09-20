import { Button, Icon } from "@lawkit/ui";
import { Badge } from "../../../components/ui/Badge";
import { MOCK_REVIEW_FINDINGS } from "./documentEditorMockData";
import * as css from "./documentEditorMock.css";

const countByKind = (kind: string): number => MOCK_REVIEW_FINDINGS.filter((item) => item.kind === kind).length;

/** 로아이 ③ 초안 검토 — 위험 조항·빈칸·누락 조항을 찾아 준다. */
export const LoaiReviewTab = () => (
  <>
    <div className={css.findingSummary}>
      <Badge color="danger" size="sm" dot>
        위험 조항 {countByKind("위험 조항")}
      </Badge>
      <Badge color="warning" size="sm" dot>
        빈칸 {countByKind("빈칸")}
      </Badge>
      <Badge color="info" size="sm" dot>
        누락 조항 {countByKind("누락 조항")}
      </Badge>
    </div>

    <ul className={css.findingList}>
      {MOCK_REVIEW_FINDINGS.map((item) => (
        <li key={item.id} className={`${css.findingBox} ${css.findingItem[item.severity]}`}>
          <span className={css.findingTop}>
            <span className={css.findingKind}>{item.kind}</span>
            <span className={css.findingWhere}>{item.where}</span>
          </span>
          <span className={css.findingTitle}>{item.title}</span>
          <span className={css.findingNote}>{item.note}</span>
        </li>
      ))}
    </ul>

    <Button variant="outline" color="secondary" iconLeft={<Icon name="refreshCw" size="sm" />}>
      고친 뒤 다시 검토하기
    </Button>

    <p className={css.disclaimer}>
      로아이 검토는 참고용이에요. 상대방에게 보내기 전에 담당 변호사가 근거를 확인하세요.
    </p>
  </>
);
