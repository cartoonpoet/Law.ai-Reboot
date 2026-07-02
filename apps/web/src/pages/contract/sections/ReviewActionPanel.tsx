import { Button, Icon, Avatar } from "@lawkit/ui";
import type { ContractStatus, ContractCan } from "@lawai/contracts";
import type { ApprovalStepView } from "../mock-data";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { getStatusLabel } from "../contractStatus";
import { getActionView } from "../getActionView";
import { cx } from "../cx";
import * as css from "../contractDetail.css";

interface ReviewActionPanelProps {
  status: ContractStatus;
  can: ContractCan;
  ownerName: string;
  approvalLine: ApprovalStepView[] | null;
  isUpdating: boolean;
  onReject: () => void;
  onReviewDone: () => void;
  onAssign: () => void;
}

/**
 * 우측 레일 "검토 액션 / 결재 현황" 패널.
 * status + can 으로 getActionView 가 파생한 선언적 뷰모델을 렌더한다(분기 로직은 순수 함수에 위임).
 * 결재 단계(signing 이후)는 결재 현황으로 전환 — 반려/배정 버튼 숨기고 approvalLine 진행 표시.
 */
export function ReviewActionPanel({
  status,
  can,
  ownerName,
  approvalLine,
  isUpdating,
  onReject,
  onReviewDone,
  onAssign,
}: ReviewActionPanelProps) {
  const view = getActionView(status, can);
  const handlers = {
    reject: onReject,
    reviewDone: onReviewDone,
    assign: onAssign,
  } as const;

  return (
    <section className={css.card}>
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

          {view.isApprovalMode && approvalLine && approvalLine.length > 0 && (
            <div>
              {approvalLine.map((step) => (
                <div key={step.order} className={css.apvrow}>
                  <span
                    className={cx(
                      css.apvnum,
                      step.statusKind === "done" && css.apvnumDone,
                      step.statusKind === "now" && css.apvnumActive,
                    )}
                  >
                    {step.order}
                  </span>
                  <span>
                    <span className={css.apvname}>{step.name}</span>
                    <span className={css.apvdept}>{step.dept}</span>
                  </span>
                  <span className={cx(css.apvtype, css.apvtypeKind[step.typeKind])}>
                    {step.type}
                  </span>
                  <span
                    className={cx(
                      css.apvstat,
                      css.apvstatWrap,
                      css.apvstatKind[step.statusKind],
                    )}
                  >
                    {step.status}
                  </span>
                </div>
              ))}
            </div>
          )}

          {view.isApprovalMode && (!approvalLine || approvalLine.length === 0) && (
            <p className={css.docEmpty}>등록된 결재선이 없습니다.</p>
          )}

          {!view.isApprovalMode && view.buttons.length > 0 && (
            <ReviewActionButtons
              buttons={view.buttons}
              isUpdating={isUpdating}
              handlers={handlers}
            />
          )}
        </div>
      </div>
    </section>
  );
}

interface ReviewActionButtonsProps {
  buttons: ReturnType<typeof getActionView>["buttons"];
  isUpdating: boolean;
  handlers: {
    reject: () => void;
    reviewDone: () => void;
    assign: () => void;
  };
}

/** 반려/검토완료는 2열 그리드, 배정은 전체폭(시안 액션패널). */
function ReviewActionButtons({ buttons, isUpdating, handlers }: ReviewActionButtonsProps) {
  const pair = buttons.filter((b) => b.kind === "reject" || b.kind === "reviewDone");
  const assign = buttons.find((b) => b.kind === "assign");
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
    </>
  );
}
