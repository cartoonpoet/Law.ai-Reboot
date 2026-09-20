import { useState } from "react";
import { Avatar, Button, HStack, Icon, Input, ListGroup, ListGroupItem, Modal, VStack } from "@lawkit/ui";
import { STANDARD_FORM_CATEGORIES } from "../../../api/standardForms";
import { useStandardFormsBrowser } from "../../contract/hooks/useStandardFormsBrowser";
import { DocMockHead } from "./DocMockHead";
import * as modalCss from "../../contract/sections/standardFormsModal.css";
import * as css from "./documentEditorMock.css";

/**
 * 5. 계약 작성 쪽 — 양식 고르기.
 * 지금 쓰는 "표준계약서 양식 보기" 모달을 그대로 두고, 다운로드 자리를 "이 양식으로 작성 시작"으로 바꾼 모습.
 */
export const StartFromFormMock = () => {
  const [isOpen, setIsOpen] = useState(true);
  const { results, counts, categoryId, selected, search, setCategoryId, selectForm } = useStandardFormsBrowser();

  return (
    <div>
      <DocMockHead
        variant="5. 계약 작성 — 이 양식으로 작성 시작"
        description="계약서 검토 요청 화면에서 등록 유형을 “표준계약서 계약체결”로 고르면 “표준계약서 양식 보기” 버튼이 살아나고, 그 버튼을 누르면 이 모달이 열립니다. 예전에는 파일을 내려받아 워드로 고쳐 다시 올려야 했지만, 이제 고른 양식의 최신 버전이 문서 편집기로 바로 열립니다."
        eyebrow="계약 관리"
        title="계약서 검토 요청"
      />

      <div className={css.openerCard}>
        <span className={css.openerTitle}>2. 계약서 · 첨부</span>
        <span className={css.openerText}>
          등록 유형 <b>표준계약서 계약체결</b>을 고른 상태입니다. 다른 계약 유형은 지금처럼 워드 파일을 올려 진행하고,
          표준계약서일 때만 회사 표준 양식에서 시작합니다. 편집기에서 저장하면 진짜 워드(.docx) 파일이 만들어져 계약서 자리에 붙으므로,
          상대방은 받은 파일을 워드에서 그대로 고칠 수 있습니다.
        </span>
        <div className={css.openerRow}>
          <Button variant="outline" color="secondary" onClick={() => setIsOpen(true)}>
            표준계약서 양식 보기
          </Button>
        </div>
      </div>

      {isOpen && (
        <Modal
          open
          onClose={() => setIsOpen(false)}
          size="xlarge"
          title="표준계약서 양식 보기"
          footer={
            <div className={css.startFoot}>
              <span className={css.startFootInfo}>
                고른 양식:{" "}
                <span className={css.startFootStrong}>{selected ? `${selected.name} ${selected.version}` : "—"}</span>
              </span>
              <div className={css.startFootBtns}>
                <Button variant="outline" color="secondary" onClick={() => setIsOpen(false)}>
                  취소
                </Button>
                <Button disabled={!selected} iconLeft={<Icon name="edit" size="sm" />}>
                  이 양식으로 작성 시작
                </Button>
              </div>
            </div>
          }
        >
          <div className={modalCss.grid3}>
            <div className={modalCss.colCats}>
              <div className={modalCss.catsHead}>분류</div>
              <ListGroup variant="flush">
                {STANDARD_FORM_CATEGORIES.map((item) => (
                  <ListGroupItem
                    key={item.id}
                    active={categoryId === item.id}
                    onClick={() => setCategoryId(item.id)}
                    trailing={<span className={modalCss.catCount}>{counts[item.id]}</span>}
                  >
                    {item.label}
                  </ListGroupItem>
                ))}
              </ListGroup>
            </div>

            <div className={modalCss.colMid}>
              <div className={modalCss.searchBar}>
                <Input
                  placeholder="양식명으로 검색"
                  rightIcon={<Icon name="search" size="sm" />}
                  onChange={(event) => search(event.target.value)}
                />
              </div>
              <div className={modalCss.colList}>
                <ListGroup variant="flush">
                  {results.map((form) => (
                    <ListGroupItem
                      key={form.id}
                      onClick={() => selectForm(form.id)}
                      leading={<Avatar size="md" system icon={<Icon name="file" size="sm" />} />}
                      trailing={
                        selected?.id === form.id ? (
                          <span className={modalCss.checkMark}>
                            <Icon name="check" size="sm" />
                          </span>
                        ) : undefined
                      }
                    >
                      <VStack gap="x1">
                        <HStack gap="x2" align="center">
                          <span className={modalCss.docName}>{form.name}</span>
                          <span className={modalCss.ver}>{form.version}</span>
                        </HStack>
                        <span className={modalCss.tplDesc}>{form.desc}</span>
                        <span className={modalCss.tplMeta}>
                          개정 {form.revisedAt} · {form.clauses}
                        </span>
                      </VStack>
                    </ListGroupItem>
                  ))}
                </ListGroup>
              </div>
            </div>

            <div className={modalCss.colPrev}>
              <div className={modalCss.prevName}>{selected?.name ?? "양식을 고르세요"}</div>
              <div className={modalCss.prevPage}>
                <div className={modalCss.prevPageTitle}>{selected?.name ?? "표준계약서"}</div>
                <div className={modalCss.prevPageSub}>STANDARD CONTRACT FORM</div>
                <div className={`${modalCss.line} ${modalCss.lineMd}`} />
                <div className={modalCss.line} />
                <div className={`${modalCss.line} ${modalCss.lineSm}`} />
                <div className={modalCss.clauseLine} />
                <div className={modalCss.line} />
                <div className={`${modalCss.line} ${modalCss.lineMd}`} />
                <div className={modalCss.clauseLine} />
                <div className={`${modalCss.line} ${modalCss.lineMd}`} />
              </div>
              <div>
                <div className={modalCss.kv}>
                  <span className={modalCss.kvK}>버전</span>
                  <span className={modalCss.kvV}>{selected?.version ?? "—"} (최신)</span>
                </div>
                <div className={modalCss.kv}>
                  <span className={modalCss.kvK}>조항</span>
                  <span className={modalCss.kvV}>{selected?.clauses ?? "—"}</span>
                </div>
                <div className={modalCss.kv}>
                  <span className={modalCss.kvK}>개정</span>
                  <span className={modalCss.kvV}>{selected?.revisedAt ?? "—"}</span>
                </div>
                <div className={modalCss.kv}>
                  <span className={modalCss.kvK}>고친 사람</span>
                  <span className={modalCss.kvV}>법무팀 김서연 변호사</span>
                </div>
              </div>
              <div className={css.startHint}>
                <Icon name="info" size="sm" />
                고르면 이 양식의 최신 버전이 문서 편집기로 열립니다. 고친 내용은 표준 양식에 영향을 주지 않습니다.
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
