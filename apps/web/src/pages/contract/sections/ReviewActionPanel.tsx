import { useState } from "react";
import { Button, Icon, Avatar } from "@lawkit/ui";
import type { ContractStatus, ContractCan } from "@lawai/contracts";
import type { ApprovalStepView } from "../mock-data";
import type { PrecheckItem } from "../getSubmitPrecheck";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { getStatusLabel } from "../contractStatus";
import { getActionView } from "../getActionView";
import type { ApprovalActionContext } from "../getActionView";
import { CompleteSigningModal } from "./CompleteSigningModal";
import { ApprovalStepRows } from "./ApprovalStepRows";
import { cx } from "../cx";
import * as css from "../contractDetail.css";

interface ReviewActionPanelProps {
  contractId: string;
  status: ContractStatus;
  can: ContractCan;
  ownerName: string;
  approvalLine: ApprovalStepView[] | null;
  // 체결일(코어 signedAt) — 결재 현황 블록의 진행 정보 행에 노출.
  signedAt: string | null;
  isUpdating: boolean;
  onReject: () => void;
  onReviewDone: () => void;
  onAssign: () => void;
  // 체결 품의(상신/결재 처리) — 결재 모듈 전용.
  approval: ApprovalActionContext;
  precheckItems: PrecheckItem[];
  onSubmitApproval: () => void;
  isSubmitting: boolean;
  onApproveStep: (comment: string) => void;
  onOpenRejectModal: () => void;
  isDeciding: boolean;
}

/**
 * 우측 레일 "검토 액션 / 체결 품의 / 결재 현황 / 체결 처리" 패널.
 * status + can + approval 로 getActionView 가 파생한 선언적 뷰모델을 렌더한다(분기 로직은 순수 함수에 위임).
 * 체결 처리 모달의 열림 상태는 이 패널이 로컬로 소유한다(AssignModal/ApprovalRejectModal 과 달리
 * 다른 패널과 공유할 필요가 없고, 성공 시 react-query invalidate 로 상위가 재조회하므로 콜백을 올릴 이유가 없다).
 */
export function ReviewActionPanel({
  contractId,
  status,
  can,
  ownerName,
  approvalLine,
  signedAt,
  isUpdating,
  onReject,
  onReviewDone,
  onAssign,
  approval,
  precheckItems,
  onSubmitApproval,
  isSubmitting,
  onApproveStep,
  onOpenRejectModal,
  isDeciding,
}: ReviewActionPanelProps) {
  const view = getActionView(status, can, approval);
  const [comment, setComment] = useState("");
  const [isCompleteSigningOpen, setIsCompleteSigningOpen] = useState(false);
  const isCompleteSigningMode = view.buttons.some((b) => b.kind === "completeSigning");
  const handlers = {
    reject: onReject,
    reviewDone: onReviewDone,
    assign: onAssign,
    submitApproval: onSubmitApproval,
    approveStep: () => onApproveStep(comment),
    rejectStep: onOpenRejectModal,
    completeSigning: () => setIsCompleteSigningOpen(true),
  } as const;

  return (
    <section className={cx(css.card, isCompleteSigningMode && css.actionPanelHighlight)}>
      <header className={css.chead}>
        <Icon name="factCheck" size="sm" className={css.cheadIcon} />
        {view.head}
      </header>
      <div className={css.cbody}>
        <div className={css.actionRow}>
          <div className={css.actionStatusRow}>
            <span className={css.actionStatusLabel}>현재 단계</span>
            <StatusBadge status={getStatusLabel(status)} size="sm" />
          </div>

          {view.showAssignee && ownerName !== "미배정" && (
            <div className={css.assignee}>
              <Avatar initials={ownerName[0]} size="sm" color="primary" />
              <div className={css.assigneeMain}>
                <div className={css.assigneeName}>
                  {ownerName} <span className={css.assigneeTeam}>법무팀</span>
                </div>
                <div className={css.assigneeRole}>검토 담당</div>
              </div>
            </div>
          )}

          {view.notice && <p className={css.actionNotice}>{view.notice}</p>}

          {/* 진행 정보 — 체결일(미등록이면 흐린 칩). 결재(체결 품의) 단계 이후에만 의미가 있다. */}
          {view.isApprovalMode && (
            <div className={css.akv}>
              <span className={css.akvKey}>체결일</span>
              <span className={css.akvValue}>
                {signedAt ? (
                  signedAt.slice(0, 10)
                ) : (
                  <span className={css.emptychip}>미등록</span>
                )}
              </span>
            </div>
          )}

          {view.isSubmitMode && <PrecheckList items={precheckItems} />}

          {view.isApprovalMode && approvalLine && approvalLine.length > 0 && (
            <ApprovalLineRows
              steps={approvalLine}
              isDecideMode={view.isDecideMode}
              comment={comment}
              onCommentChange={setComment}
              onApprove={() => onApproveStep(comment)}
              onOpenRejectModal={onOpenRejectModal}
              isDeciding={isDeciding}
            />
          )}

          {view.isApprovalMode && (!approvalLine || approvalLine.length === 0) && (
            <p className={css.docEmpty}>등록된 결재선이 없습니다.</p>
          )}

          {!view.isDecideMode && view.buttons.length > 0 && (
            <ReviewActionButtons
              buttons={view.buttons}
              isUpdating={isUpdating || isSubmitting}
              handlers={handlers}
            />
          )}
        </div>
      </div>

      {isCompleteSigningOpen && (
        <CompleteSigningModal
          contractId={contractId}
          onClose={() => setIsCompleteSigningOpen(false)}
        />
      )}
    </section>
  );
}

function PrecheckList({ items }: { items: PrecheckItem[] }) {
  return (
    <div className={css.precheckList}>
      {items.map((item) => (
        <div key={item.key} className={css.precheckRow}>
          <span
            className={cx(
              css.precheckIcon,
              item.ok ? css.precheckIconOk : css.precheckIconWarn,
            )}
          >
            <Icon name={item.ok ? "check" : "alertTriangle"} size="sm" />
          </span>
          <div>
            <span className={css.precheckLabel}>{item.label}</span>
            {item.sub && <span className={css.precheckSub}>{item.sub}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

interface ApprovalLineRowsProps {
  steps: ApprovalStepView[];
  isDecideMode: boolean;
  comment: string;
  onCommentChange: (value: string) => void;
  onApprove: () => void;
  onOpenRejectModal: () => void;
  isDeciding: boolean;
}

/** 결재 현황 타임라인 — 내 차례(statusKind="now")면 의견 입력 + 승인/반려 박스를 그 자리에 끼워 넣는다. */
function ApprovalLineRows({
  steps,
  isDecideMode,
  comment,
  onCommentChange,
  onApprove,
  onOpenRejectModal,
  isDeciding,
}: ApprovalLineRowsProps) {
  return (
    <div>
      <ApprovalStepRows
        steps={steps}
        currentStepExtra={
          isDecideMode && (
            <div className={css.decideBox}>
              <div className={css.decideLabel}>
                <Icon name="edit" size="sm" />
                결재 의견 (선택)
              </div>
              <textarea
                className={css.decideTextarea}
                placeholder="승인/반려 의견을 입력하세요"
                value={comment}
                onChange={(e) => onCommentChange(e.target.value)}
              />
              <div className={css.decideButtons}>
                <Button
                  type="button"
                  variant="outline"
                  color="danger"
                  disabled={isDeciding}
                  onClick={onOpenRejectModal}
                >
                  반려
                </Button>
                <Button type="button" disabled={isDeciding} onClick={onApprove}>
                  승인
                </Button>
              </div>
            </div>
          )
        }
      />
    </div>
  );
}

interface ReviewActionButtonsProps {
  buttons: ReturnType<typeof getActionView>["buttons"];
  isUpdating: boolean;
  handlers: {
    reject: () => void;
    reviewDone: () => void;
    assign: () => void;
    submitApproval: () => void;
    approveStep: () => void;
    rejectStep: () => void;
    completeSigning: () => void;
  };
}

/** 반려/검토완료는 2열 그리드, 배정·상신·체결 처리는 전체폭(시안 액션패널). */
function ReviewActionButtons({ buttons, isUpdating, handlers }: ReviewActionButtonsProps) {
  const pair = buttons.filter((b) => b.kind === "reject" || b.kind === "reviewDone");
  const assign = buttons.find((b) => b.kind === "assign");
  const submit = buttons.find((b) => b.kind === "submitApproval");
  const complete = buttons.find((b) => b.kind === "completeSigning");
  return (
    <>
      {pair.length > 0 && (
        <div className={css.actionGrid}>
          {pair.map((b) => (
            <Button
              key={b.kind}
              size="medium"
              color={b.color}
              variant={b.variant}
              disabled={isUpdating}
              onClick={handlers[b.kind]}
            >
              {b.label}
            </Button>
          ))}
        </div>
      )}
      {assign && (
        <Button
          size="medium"
          variant="outline"
          iconLeft={<Icon name="user" size="sm" className={css.btnIcon} />}
          disabled={isUpdating}
          onClick={handlers.assign}
        >
          {assign.label}
        </Button>
      )}
      {submit && (
        <Button
          size="medium"
          disabled={isUpdating || submit.disabled}
          onClick={handlers.submitApproval}
        >
          {submit.label}
        </Button>
      )}
      {complete && (
        <Button
          size="medium"
          color={complete.color}
          iconLeft={<Icon name="checkCircle" size="sm" className={css.btnIcon} />}
          disabled={isUpdating}
          onClick={handlers.completeSigning}
        >
          {complete.label}
        </Button>
      )}
    </>
  );
}
