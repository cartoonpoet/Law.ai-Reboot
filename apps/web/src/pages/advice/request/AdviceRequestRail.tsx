import { useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { Button, Card, Icon } from "@lawkit/ui";
import { ApprovalLineModal } from "../../contract/sections/ApprovalLineModal";
import { checkNeedsApproval } from "../approval/adviceApprovers";
import { ApproverRows } from "../approval/ApproverRows";
import type { AdviceRequestFormTypes } from "./adviceRequestSchema";
import * as approvalCss from "../approval/adviceApproval.css";
import * as formCss from "../../contract/contractRequest.css";
import * as css from "./adviceRequest.css";

const FLOW = [
  { title: "요청 결재", desc: "결재선에 결재자를 넣으면 승인 후 법무팀에 접수돼요. 넣지 않으면 바로 접수됩니다." },
  { title: "검토 · 추가 질의", desc: "확인이 필요한 내용은 담당자가 상세 화면에서 질문합니다." },
  { title: "회신", desc: "회신을 확인하고 종결하세요. 더 물을 것이 있으면 이어서 질문할 수 있어요." },
];

const approvalHeader = (
  <span className={formCss.railHead}>
    <Icon name="factCheck" size="sm" className={formCss.railHeadIcon} />
    요청 결재선
  </span>
);

const flowHeader = (
  <span className={formCss.railHead}>
    <Icon name="info" size="sm" className={formCss.railHeadIcon} />
    요청 후 진행
  </span>
);

/** 자문 요청 우측 레일 — 요청 결재선(계약 요청 폼과 같은 패널·모달)과 진행 안내. */
export const AdviceRequestRail = () => {
  const { control } = useFormContext<AdviceRequestFormTypes>();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className={formCss.rail}>
      <Controller
        name="approvers"
        control={control}
        render={({ field }) => (
          <Card bordered header={approvalHeader}>
            <div className={approvalCss.approverList}>
              <ApproverRows approvers={field.value} />
              <p className={approvalCss.approverHint}>
                {checkNeedsApproval(field.value)
                  ? "결재가 끝나면 법무팀에 접수됩니다."
                  : "결재자가 없어 요청하면 바로 접수됩니다."}
              </p>
              <Button
                type="button"
                variant="outline"
                color="secondary"
                size="small"
                iconLeft={<Icon name="factCheck" size="sm" />}
                onClick={() => setIsModalOpen(true)}
              >
                결재선 설정
              </Button>
            </div>
            {isModalOpen && (
              <ApprovalLineModal
                initial={field.value}
                onClose={() => setIsModalOpen(false)}
                onApply={(next) => {
                  field.onChange(next);
                  setIsModalOpen(false);
                }}
              />
            )}
          </Card>
        )}
      />

      <Card bordered header={flowHeader}>
        <ol className={css.flowList}>
          {FLOW.map((step, index) => (
            <li key={step.title} className={css.flowItem}>
              <span className={css.flowNum}>{index + 1}</span>
              <div>
                <div className={css.flowTitle}>{step.title}</div>
                <div className={css.flowDesc}>{step.desc}</div>
              </div>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
};
