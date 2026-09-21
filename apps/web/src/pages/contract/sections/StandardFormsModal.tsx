import { Modal, Button, Icon, ListGroup, ListGroupItem } from "@lawkit/ui";
import type { TemplateCategoryTypes, TemplateSummaryDto } from "@lawai/contracts";
import { STANDARD_FORM_CATEGORIES } from "../../../api/standardForms";
import { useStandardFormsBrowser } from "../hooks/useStandardFormsBrowser";
import { StandardFormList } from "./StandardFormList";
import { StandardFormPreview } from "./StandardFormPreview";
import * as css from "./standardFormsModal.css";

interface StandardFormsModalProps {
  onClose: () => void;
  onStart: (template: TemplateSummaryDto) => void;
}

/** 표준계약서 양식 보기 — 분류·양식 목록·미리보기를 lawkit 컴포넌트로 구성. */
export function StandardFormsModal({ onClose, onStart }: StandardFormsModalProps) {
  const {
    results,
    counts,
    categoryId,
    keyword,
    searchedKeyword,
    selected,
    isFetching,
    isError,
    retry,
    search,
    changeCategory,
    selectForm,
  } = useStandardFormsBrowser();

  return (
    <Modal
      open
      onClose={onClose}
      size="xlarge"
      title="표준계약서 양식 보기"
      footer={
        <div className={css.footRow}>
          <span className={css.footInfo}>
            고른 양식:{" "}
            <span className={css.footStrong}>{selected ? `${selected.name} v${selected.currentVersionNo}` : "—"}</span>
          </span>
          <div className={css.footBtns}>
            <Button type="button" variant="outline" color="secondary" onClick={onClose}>취소</Button>
            <Button
              type="button"
              disabled={!selected}
              iconLeft={<Icon name="edit" size="sm" />}
              onClick={() => selected && onStart(selected)}
            >
              이 양식으로 작성 시작
            </Button>
          </div>
        </div>
      }
    >
      <div className={css.grid3}>
        <div className={css.colCats}>
          <div className={css.catsHead}>분류</div>
          <ListGroup variant="flush">
            {STANDARD_FORM_CATEGORIES.map((c) => (
              <ListGroupItem
                key={c.id}
                active={categoryId === c.id}
                onClick={() => changeCategory(c.id)}
                // 아직 건수를 못 받았으면 0건이라고 단정하지 않고 "—"로 둔다.
                trailing={<span className={css.catCount}>{counts?.[c.id as TemplateCategoryTypes] ?? "—"}</span>}
              >
                {c.label}
              </ListGroupItem>
            ))}
          </ListGroup>
        </div>

        <StandardFormList
          results={results}
          selectedId={selected?.id}
          keyword={keyword}
          searchedKeyword={searchedKeyword}
          isFetching={isFetching}
          isError={isError}
          onSearch={search}
          onSelect={selectForm}
          onRetry={() => void retry()}
        />

        <StandardFormPreview selected={selected} isFetching={isFetching} isError={isError} />
      </div>
    </Modal>
  );
}
