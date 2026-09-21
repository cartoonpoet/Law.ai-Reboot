import type { MouseEvent } from "react";
import { Modal, Button, Input, Checkbox, Icon } from "@lawkit/ui";
import {
  RELATED_DOC_CATEGORY_OPTIONS,
  categoryLabel,
  isRelatedDocCategoryReady,
  type RelatedDoc,
} from "../../../api/relatedDocs";
import { useRelatedDocsBrowser } from "../hooks/useRelatedDocsBrowser";
import * as css from "./relatedDocsModal.css";

interface RelatedDocsModalProps {
  selected: RelatedDoc[];
  onClose: () => void;
  onConfirm: (docs: RelatedDoc[]) => void;
}

// 체크박스 클릭이 행(row) onClick으로 버블링돼 토글이 두 번 일어나는 것을 막는다.
const stopBubble = (e: MouseEvent) => e.stopPropagation();

/**
 * 관련문서 찾아보기 모달.
 * 좌측 분류 체크박스 필터 + 우측 문서 목록(체크 선택)을 띄우고,
 * '선택 완료' 시 고른 문서를 onConfirm으로 넘긴다(취소 시 폐기).
 */
export function RelatedDocsModal({ selected, onClose, onConfirm }: RelatedDocsModalProps) {
  const { results, contractTotal, categories, checked, search, toggleCategory, toggleDoc, isChecked } =
    useRelatedDocsBrowser(selected);

  return (
    <Modal
      open
      onClose={onClose}
      size="large"
      title="관련문서 찾아보기"
      footer={
        <div className={css.footRow}>
          <span className={css.footInfo}>
            선택 <span className={css.footCount}>{checked.length}</span>건
          </span>
          <div className={css.footBtns}>
            <Button type="button" variant="outline" color="secondary" onClick={onClose}>취소</Button>
            <Button type="button" onClick={() => onConfirm(checked)}>선택 완료</Button>
          </div>
        </div>
      }
    >
      <div className={css.wrap}>
        <Input
          placeholder="계약명 · 관리번호 · 상대계약자로 검색"
          rightIcon={<Icon name="search" size="sm" />}
          onChange={(e) => search(e.target.value)}
        />

        <div className={css.panel}>
          <aside className={css.cats}>
            <p className={css.catsHead}>분류</p>
            {RELATED_DOC_CATEGORY_OPTIONS.map(({ value, label }) =>
              isRelatedDocCategoryReady(value) ? (
                <div key={value} className={css.cat} onClick={() => toggleCategory(value)}>
                  <Checkbox
                    checked={categories.includes(value)}
                    onCheckedChange={() => toggleCategory(value)}
                    onClick={stopBubble}
                  />
                  <span className={css.dot[value]} />
                  <span className={css.catName}>{label}</span>
                  <span className={css.catCount}>{contractTotal ?? "-"}</span>
                </div>
              ) : (
                // 자문·송무·법무프로젝트는 아직 저장된 문서가 없어 고를 수 없다.
                <div key={value} className={`${css.cat} ${css.catDisabled}`}>
                  <Checkbox checked={false} disabled />
                  <span className={css.dot[value]} />
                  <span className={css.catName}>{label}</span>
                  <span className={css.catCount}>준비 중</span>
                </div>
              ),
            )}
          </aside>

          <div className={css.docs}>
            {results.length === 0 ? (
              <div className={css.empty}>검색 결과가 없습니다</div>
            ) : (
              results.map((doc) => (
                <div
                  key={doc.id}
                  className={`${css.doc} ${isChecked(doc.id) ? css.docOn : ""}`}
                  onClick={() => toggleDoc(doc)}
                >
                  <Checkbox checked={isChecked(doc.id)} onCheckedChange={() => toggleDoc(doc)} onClick={stopBubble} />
                  <div className={css.docIcon}><Icon name="file" size="sm" /></div>
                  <div className={css.docMain}>
                    <div className={css.docName}>
                      {doc.name}
                      <span className={css.tag[doc.category]}>{categoryLabel(doc.category)}</span>
                    </div>
                    <div className={css.docSub}>{doc.sub}</div>
                  </div>
                  <span className={css.docWhen}>{doc.date}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
