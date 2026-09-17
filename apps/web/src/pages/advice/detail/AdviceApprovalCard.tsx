import { useState } from "react";
import { Button, Icon } from "@lawkit/ui";
import type { AdviceResponse, ApprovalLineDto } from "@lawai/contracts";
import { ApprovalStepRows } from "../../contract/sections/ApprovalStepRows";
import { toApprovalStep } from "../../contract/toDetailView";
import * as base from "../../contract/contractDetail.css";
import * as approvalCss from "../approval/adviceApproval.css";

const LINE_STATUS_LABEL: Record<ApprovalLineDto["status"], string> = {
  pending: "진행 중",
  approved: "승인 완료",
  rejected: "반려",
};

interface DecideBoxProps {
  isDeciding: boolean;
  onDecide: (decision: "approve" | "reject", comment: string) => void;
}

// 내 차례일 때 그 단계 아래에 끼워 넣는 의견 + 승인/반려 — 계약 상세 결재 박스와 같은 모양.
const DecideBox = ({ isDeciding, onDecide }: DecideBoxProps) => {
  const [comment, setComment] = useState("");
  return (
    <div className={base.decideBox}>
      <div className={base.decideLabel}>
        <Icon name="edit" size="sm" />
        결재 의견 (선택)
      </div>
      <textarea
        className={base.decideTextarea}
        placeholder="승인/반려 의견을 입력하세요"
        value={comment}
        onChange={(event) => setComment(event.target.value)}
      />
      <div className={base.decideButtons}>
        <Button type="button" variant="outline" color="danger" disabled={isDeciding} onClick={() => onDecide("reject", comment)}>
          반려
        </Button>
        <Button type="button" disabled={isDeciding} onClick={() => onDecide("approve", comment)}>
          승인
        </Button>
      </div>
    </div>
  );
};

interface ApprovalLineSectionProps {
  title: string;
  line: ApprovalLineDto;
  viewerId: string | null;
  isDeciding: boolean;
  onDecide: (lineId: string, decision: "approve" | "reject", comment: string) => void;
}

const ApprovalLineSection = ({ title, line, viewerId, isDeciding, onDecide }: ApprovalLineSectionProps) => {
  const steps = line.steps.map((step) => toApprovalStep(step, line.currentStepId));
  const currentStep = line.steps.find((step) => step.id === line.currentStepId);
  const isMyTurn = line.status === "pending" && Boolean(viewerId) && currentStep?.userId === viewerId;

  return (
    <div className={approvalCss.lineSection}>
      <div className={approvalCss.lineTitle}>
        {title}
        <span className={approvalCss.lineStatus}>{LINE_STATUS_LABEL[line.status]}</span>
      </div>
      <ApprovalStepRows
        steps={steps}
        currentStepExtra={
          isMyTurn && (
            <DecideBox
              key={line.currentStepId}
              isDeciding={isDeciding}
              onDecide={(decision, comment) => onDecide(line.id, decision, comment)}
            />
          )
        }
      />
    </div>
  );
};

interface AdviceApprovalCardProps {
  advice: AdviceResponse;
  viewerId: string | null;
  isDeciding: boolean;
  onDecide: (lineId: string, decision: "approve" | "reject", comment: string) => void;
}

/** 결재 — 요청 결재·회신 결재 가운데 올라간 것만 보여주고, 내 차례면 그 자리에서 승인·반려한다. */
export const AdviceApprovalCard = ({ advice, viewerId, isDeciding, onDecide }: AdviceApprovalCardProps) => {
  const sections = [
    { title: "요청 결재", line: advice.requestApproval },
    { title: "회신 결재", line: advice.answerApproval },
  ].filter((section): section is { title: string; line: ApprovalLineDto } => section.line !== null);

  if (sections.length === 0) return null;

  return (
    <section className={base.card}>
      <header className={base.chead}>
        <Icon name="factCheck" size="sm" className={base.cheadIconMuted} />
        결재
      </header>
      <div className={`${base.cbody} ${approvalCss.lineSections}`}>
        {sections.map((section) => (
          <ApprovalLineSection
            key={section.line.id}
            title={section.title}
            line={section.line}
            viewerId={viewerId}
            isDeciding={isDeciding}
            onDecide={onDecide}
          />
        ))}
      </div>
    </section>
  );
};
