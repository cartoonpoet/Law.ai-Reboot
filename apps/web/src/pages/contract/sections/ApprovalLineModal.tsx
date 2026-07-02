import { useState } from "react";
import type { DragEvent } from "react";
import { Modal, Input, Button, ButtonGroup, Icon, Avatar, VStack } from "@lawkit/ui";
import type { Approver } from "../request-schema";
import type { PersonRef } from "../../../api/directory";
import { useApproverSearch } from "../hooks/useApproverSearch";
import { APPROVER_TYPE_LABEL as TYPE_LABEL, APPROVER_TYPE_AVATAR as TYPE_AVATAR } from "./approverMeta";
import * as css from "./approvalLineModal.css";

type StepType = Approver["type"];
interface Step extends Approver { id: string }

const TYPE_ITEMS = [
  { value: "approve", label: "결재" },
  { value: "agree", label: "합의" },
  { value: "refer", label: "참조" },
];

interface ApprovalLineModalProps {
  initial: Approver[];
  onClose: () => void;
  onApply: (approvers: Approver[]) => void;
}

/** 결재선 설정 — 좌측에서 결재자를 골라 추가, 우측 흐름 타임라인에서 드래그 정렬·유형 관리. */
export function ApprovalLineModal({ initial, onClose, onApply }: ApprovalLineModalProps) {
  const [steps, setSteps] = useState<Step[]>(() => initial.map((a, i) => ({ ...a, id: `init-${i}` })));
  const [addType, setAddType] = useState("approve");
  const { people, search } = useApproverSearch();

  const isAdded = (name: string) => steps.some((s) => s.name === name);
  const count = (t: StepType) => steps.filter((s) => s.type === t).length;

  const addPerson = (p: PersonRef) => {
    if (isAdded(p.name)) return;
    setSteps((prev) => [...prev, { id: `st${Date.now()}`, name: p.name, dept: p.dept, type: addType as StepType }]);
  };
  const removeStep = (i: number) => setSteps((prev) => prev.filter((_, idx) => idx !== i));

  // 드래그 정렬 — 기안(0)은 고정, 다른 단계만 이동/드롭 대상
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const reorder = (from: number, to: number) =>
    setSteps((prev) => { const n = [...prev]; const [m] = n.splice(from, 1); n.splice(to, 0, m); return n; });
  const handleDragOver = (i: number) => (e: DragEvent) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === i || i < 1) return;
    reorder(dragIndex, i);
    setDragIndex(i);
  };

  const apply = () => onApply(steps.map((s) => ({ name: s.name, dept: s.dept, type: s.type })));

  return (
    <Modal
      open
      onClose={onClose}
      size="xlarge"
      title="결재선 설정"
      footer={
        <div className={css.footRow}>
          <span className={css.footInfo}>총 {steps.length}단계</span>
          <div className={css.footBtns}>
            <Button type="button" variant="outline" color="secondary" onClick={onClose}>취소</Button>
            <Button type="button" onClick={apply}>적용</Button>
          </div>
        </div>
      }
    >
      <div className={css.bodyGrid}>
        {/* 좌측: 결재자 추가 */}
        <aside className={css.leftPane}>
          <div className={css.leftHead}>결재자 추가</div>
          <div className={css.leftSearch}>
            <Input placeholder="이름·부서 검색" rightIcon={<Icon name="search" size="sm" />} onChange={(e) => search(e.target.value)} />
          </div>
          <div className={css.leftSearch}>
            <div className={css.typePick}>
              <ButtonGroup variant="outline" value={addType} onChange={setAddType} items={TYPE_ITEMS} />
            </div>
          </div>
          <div className={css.peopleScroll}>
            {people.map((p) => {
              const added = isAdded(p.name);
              return (
                <div key={p.id} className={added ? `${css.personRow} ${css.personRowOn}` : css.personRow} onClick={() => addPerson(p)}>
                  <Avatar size="sm" color="secondary" initials={p.name[0]} />
                  <div className={css.personMain}>
                    <div className={css.personName}>{p.name}</div>
                    <div className={css.personDept}>{p.dept}</div>
                  </div>
                  <span className={added ? css.personCheck : css.personAdd}>
                    <Icon name={added ? "check" : "plus"} size="sm" />
                  </span>
                </div>
              );
            })}
          </div>
        </aside>

        {/* 우측: 결재 흐름 타임라인 */}
        <section className={css.rightPane}>
          <div className={css.rightHead}>
            <span className={css.flowTitle}>결재 흐름</span>
            <div className={css.summaryChips}>
              <span className={css.chip.draft}>기안 {count("draft")}</span>
              {count("approve") > 0 && <span className={css.chip.approve}>결재 {count("approve")}</span>}
              {count("agree") > 0 && <span className={css.chip.agree}>합의 {count("agree")}</span>}
              {count("refer") > 0 && <span className={css.chip.refer}>참조 {count("refer")}</span>}
            </div>
          </div>

          <div className={css.flow}>
            {steps.map((s, i) => (
              <div key={s.id} className={css.stepRow} onDragOver={handleDragOver(i)}>
                <div className={css.nodeCol}>
                  {i < steps.length - 1 && <span className={css.connector} />}
                  <span className={css.node[s.type]}>
                    <Avatar size="md" color={TYPE_AVATAR[s.type]} initials={s.name[0]} />
                  </span>
                </div>
                <div
                  className={[css.stepCard, s.type !== "draft" && css.cardDrag, dragIndex === i && css.dragging].filter(Boolean).join(" ")}
                  draggable={s.type !== "draft"}
                  onDragStart={s.type !== "draft" ? () => setDragIndex(i) : undefined}
                  onDragEnd={() => setDragIndex(null)}
                >
                  <div className={css.stepMain}>
                    {s.type !== "draft" && <span className={css.grip}><Icon name="menu" size="sm" /></span>}
                    <span className={css.typeBadge[s.type]}>{TYPE_LABEL[s.type]}</span>
                    <VStack gap="x1">
                      <span className={css.stepName}>{s.name}</span>
                      <span className={css.stepDept}>{s.dept}</span>
                    </VStack>
                  </div>
                  {s.type !== "draft" && (
                    <div className={css.stepActions}>
                      <Button type="button" variant="outline" color="secondary" size="small" iconLeft={<Icon name="trash" size="sm" />} onClick={() => removeStep(i)} aria-label="삭제" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Modal>
  );
}
