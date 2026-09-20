import type { MouseEvent } from "react";
import { Modal, Input, Button, Icon, Avatar, ListGroup, ListGroupItem, HStack, VStack } from "@lawkit/ui";
import { STANDARD_FORM_CATEGORIES, type StandardForm } from "../../../api/standardForms";
import { useStandardFormsBrowser } from "../hooks/useStandardFormsBrowser";
import * as css from "./standardFormsModal.css";

const stopBubble = (e: MouseEvent) => e.stopPropagation();

interface StandardFormsModalProps {
  onClose: () => void;
  onAttach: (form: StandardForm) => void;
}

/** 표준계약서 양식 보기 — 분류·양식 목록·미리보기를 lawkit 컴포넌트로 구성. */
export function StandardFormsModal({ onClose, onAttach }: StandardFormsModalProps) {
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
            선택: <span className={css.footStrong}>{selected ? `${selected.name} ${selected.version}` : "—"}</span>
          </span>
          <div className={css.footBtns}>
            <Button type="button" variant="outline" color="secondary" onClick={onClose}>취소</Button>
            <Button type="button" disabled={!selected} onClick={() => selected && onAttach(selected)}>이 양식으로 첨부</Button>
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
                trailing={<span className={css.catCount}>{counts[c.id]}</span>}
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
                    <HStack gap="x2" align="center">
                      {selected?.id === form.id && <span className={css.checkMark}><Icon name="check" size="sm" /></span>}
                      <Button type="button" variant="outline" color="secondary" size="small"
                        iconLeft={<Icon name="download" size="sm" />} onClick={stopBubble} />
                    </HStack>
                  }
                >
                  <VStack gap="x1">
                    <HStack gap="x2" align="center">
                      <span className={css.docName}>{form.name}</span>
                      <span className={css.ver}>{form.version}</span>
                    </HStack>
                    <span className={css.tplDesc}>{form.desc}</span>
                    <span className={css.tplMeta}>개정 {form.revisedAt} · {form.clauses} · DOCX</span>
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
            <div className={css.kv}><span className={css.kvK}>버전</span><span className={css.kvV}>{selected?.version ?? "—"} (최신)</span></div>
            <div className={css.kv}><span className={css.kvK}>조항</span><span className={css.kvV}>{selected?.clauses ?? "—"}</span></div>
            <div className={css.kv}><span className={css.kvK}>개정</span><span className={css.kvV}>{selected?.revisedAt ?? "—"}</span></div>
            <div className={css.kv}><span className={css.kvK}>형식</span><span className={css.kvV}>DOCX · 편집 가능</span></div>
          </div>
          <Button type="button" variant="outline" color="secondary" iconLeft={<Icon name="download" size="sm" />}>다운로드</Button>
        </div>
      </div>
    </Modal>
  );
}
