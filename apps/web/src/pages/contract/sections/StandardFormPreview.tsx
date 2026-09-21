import { EmptyState, Icon } from "@lawkit/ui";
import type { TemplateSummaryDto } from "@lawai/contracts";
import * as css from "./standardFormsModal.css";

interface StandardFormPreviewProps {
  selected?: TemplateSummaryDto;
  isFetching: boolean;
  isError: boolean;
}

/** 고른 양식이 없을 때 보여줄 안내 — 지금 상태(불러오는 중·실패·없음)를 그대로 말한다. */
const getEmptyNotice = (isFetching: boolean, isError: boolean) => {
  if (isError) {
    return {
      title: "미리보기를 열 수 없어요",
      description: "양식을 불러오지 못했습니다. 가운데 “다시 시도”를 눌러 주세요.",
    };
  }
  if (isFetching) {
    return { title: "양식을 불러오는 중이에요", description: "잠시만 기다려 주세요." };
  }
  return { title: "고른 양식이 없어요", description: "가운데에서 양식을 고르면 여기에 미리보기가 나옵니다." };
};

/** 고른 양식 미리보기 칸 — 고른 것이 없으면 빈 문서 모양을 보여주지 않는다. */
export const StandardFormPreview = ({ selected, isFetching, isError }: StandardFormPreviewProps) => {
  if (!selected) {
    const notice = getEmptyNotice(isFetching, isError);
    return (
      <div className={css.colPrev}>
        <div className={css.prevEmpty}>
          <EmptyState
            icon={<Icon name={isError ? "alertTriangle" : "fileText"} size="lg" />}
            title={notice.title}
            description={notice.description}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={css.colPrev}>
      <div className={css.prevName}>{selected.name}</div>
      <div className={css.prevPage}>
        <div className={css.prevPageTitle}>{selected.name}</div>
        <div className={css.prevPageSub}>STANDARD CONTRACT FORM</div>
        <div className={`${css.line} ${css.lineMd}`} />
        <div className={css.line} />
        <div className={`${css.line} ${css.lineSm}`} />
        <div className={css.clauseLine} />
        <div className={css.line} />
        <div className={`${css.line} ${css.lineMd}`} />
        <div className={css.clauseLine} />
        <div className={`${css.line} ${css.lineMd}`} />
      </div>
      <div>
        <div className={css.kv}>
          <span className={css.kvK}>버전</span>
          <span className={css.kvV}>v{selected.currentVersionNo} (최신)</span>
        </div>
        <div className={css.kv}>
          <span className={css.kvK}>작성자</span>
          <span className={css.kvV}>{selected.createdByName ?? "—"}</span>
        </div>
        <div className={css.kv}>
          <span className={css.kvK}>개정</span>
          <span className={css.kvV}>{selected.updatedAt.slice(0, 10)}</span>
        </div>
      </div>
      <p className={css.prevHint}>
        <Icon name="info" size="sm" className={css.prevHintIcon} />
        고르면 이 양식의 최신 버전이 문서 편집기로 열립니다. 저장하면 워드(.docx) 파일이 만들어져 계약서 자리에 붙고, 회사 표준 양식은
        그대로 남습니다.
      </p>
    </div>
  );
};
