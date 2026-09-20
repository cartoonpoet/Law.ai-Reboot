import { Modal, Input, Button, Icon, Avatar, ListGroup, ListGroupItem, HStack, VStack } from "@lawkit/ui";
import type { TemplateCategoryTypes, TemplateSummaryDto } from "@lawai/contracts";
import { STANDARD_FORM_CATEGORIES } from "../../../api/standardForms";
import { useStandardFormsBrowser } from "../hooks/useStandardFormsBrowser";
import * as css from "./standardFormsModal.css";

interface StandardFormsModalProps {
  onClose: () => void;
  onStart: (template: TemplateSummaryDto) => void;
}

/** 표준계약서 양식 보기 — 분류·양식 목록·미리보기를 lawkit 컴포넌트로 구성. */
export function StandardFormsModal({ onClose, onStart }: StandardFormsModalProps) {
  const { results, counts, categoryId, selected, search, setCategoryId, selectForm } = useStandardFormsBrowser();

  return (
    <Modal
      open
      onClose={onClose}
      size="xlarge"
      title="표준계약서 양식 보기"
      footer={
        <div className={css.footRow}>
          <span className={css.footInfo}>
            선택: <span className={css.footStrong}>{selected ? `${selected.name} v${selected.currentVersionNo}` : "—"}</span>
          </span>
          <div className={css.footBtns}>
            <Button type="button" variant="outline" color="secondary" onClick={onClose}>취소</Button>
            <Button type="button" disabled={!selected} onClick={() => selected && onStart(selected)}>이 양식으로 작성 시작</Button>
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
                onClick={() => setCategoryId(c.id)}
                trailing={<span className={css.catCount}>{counts?.[c.id as TemplateCategoryTypes] ?? 0}</span>}
              >
                {c.label}
              </ListGroupItem>
            ))}
          </ListGroup>
        </div>

        <div className={css.colMid}>
          <div className={css.searchBar}>
            <Input placeholder="양식명으로 검색" rightIcon={<Icon name="search" size="sm" />}
              onChange={(e) => search(e.target.value)} />
          </div>
          <div className={css.colList}>
            <ListGroup variant="flush">
              {results.map((form) => (
                <ListGroupItem
                  key={form.id}
                  onClick={() => selectForm(form.id)}
                  leading={<Avatar size="md" system icon={<Icon name="file" size="sm" />} />}
                  trailing={
                    selected?.id === form.id ? (
                      <span className={css.checkMark}><Icon name="check" size="sm" /></span>
                    ) : undefined
                  }
                >
                  <VStack gap="x1">
                    <HStack gap="x2" align="center">
                      <span className={css.docName}>{form.name}</span>
                      <span className={css.ver}>v{form.currentVersionNo}</span>
                    </HStack>
                    <span className={css.tplMeta}>{form.createdByName ?? "—"} 작성 · 개정 {form.updatedAt.slice(0, 10)} · DOCX</span>
                  </VStack>
                </ListGroupItem>
              ))}
            </ListGroup>
          </div>
        </div>

        <div className={css.colPrev}>
          <div className={css.prevName}>{selected?.name ?? "양식을 선택하세요"}</div>
          <div className={css.prevPage}>
            <div className={css.prevPageTitle}>{selected?.name ?? "표준계약서"}</div>
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
            <div className={css.kv}><span className={css.kvK}>버전</span><span className={css.kvV}>{selected ? `v${selected.currentVersionNo}` : "—"} (최신)</span></div>
            <div className={css.kv}><span className={css.kvK}>작성자</span><span className={css.kvV}>{selected?.createdByName ?? "—"}</span></div>
            <div className={css.kv}><span className={css.kvK}>개정</span><span className={css.kvV}>{selected?.updatedAt.slice(0, 10) ?? "—"}</span></div>
            <div className={css.kv}><span className={css.kvK}>형식</span><span className={css.kvV}>DOCX · 편집 가능</span></div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
