import { useState } from "react";
import type { ApprovalLineResponse, ApprovalStepResponse, ContractStatus } from "@lawai/contracts";
import { Button, Callout, Dropdown, Icon } from "@lawkit/ui";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { getStatusLabel } from "../../contract/contractStatus";
import { getLifecycleProgress } from "../../contract/getLifecycleProgress";
import { LifecycleRing } from "../../contract/sections/LifecycleRing";
import * as cd from "../../contract/contractDetail.css";
import * as css from "./contractLifecycleMock.css";

const STATUSES: ContractStatus[] = [
  "draft",
  "unassigned",
  "assigning",
  "legalReview",
  "requesterReview",
  "reviewDone",
  "signing",
  "signed",
  "fulfilling",
  "closed",
];

const STATUS_OPTIONS = STATUSES.map((status, i) => ({ value: status, label: `${i + 1}. ${getStatusLabel(status)}` }));

// 시안용 mock — 체결 진행에서 결재 승인 비율이 게이지에 반영되는 모습을 보이기 위한 결재선
const createStep = (id: string, type: ApprovalStepResponse["type"], status: ApprovalStepResponse["status"]): ApprovalStepResponse => ({
  id,
  stepOrder: 0,
  userId: null,
  name: "홍길동",
  dept: "법무팀",
  type,
  status,
  comment: null,
  decidedAt: null,
});

const MOCK_APPROVAL_LINE: ApprovalLineResponse = {
  id: "mock-line",
  status: "pending",
  steps: [createStep("s1", "draft", "approved"), createStep("s2", "approve", "approved"), createStep("s3", "agree", "approved"), createStep("s4", "approve", "pending")],
  currentStepId: "s4",
  submittedById: "mock-user",
  submittedAt: "2026-09-10T00:00:00Z",
};

const MOCK_DUE_DATE = new Date(Date.now() + 5 * 86_400_000).toISOString();

const GLANCE = [
  { label: "상대 계약자", value: "-" },
  { label: "계약 분류", value: "한국과학기술원" },
  { label: "계약 기간", value: "2026-10-01 ~ 2028-09-30" },
  { label: "실 지급액", value: "374,000,000 KRW" },
  { label: "협상력", value: "50%" },
  { label: "법무 담당자", value: "김법무" },
];

/** 계약 상세 진행 게이지 시안(채택안 D) — 실제 LifecycleRing 을 상태별로 돌려보는 평가 페이지. */
export const ContractLifecycleMock = () => {
  const [status, setStatus] = useState<ContractStatus>("signing");
  const [replayCount, setReplayCount] = useState(0);
  const index = STATUSES.indexOf(status);

  const progress = getLifecycleProgress({
    status,
    ownerName: "김법무",
    dueDate: MOCK_DUE_DATE,
    signedAt: "2026-09-20T00:00:00.000Z",
    period: "2026-10-01 ~ 2028-09-30",
    approvalLine: MOCK_APPROVAL_LINE,
    now: new Date(),
  });

  const handleStatusChange = (value: string | string[]) => setStatus(value as ContractStatus);

  return (
    <div className={css.page}>
      <div className={css.controls}>
        <Dropdown size="small" options={STATUS_OPTIONS} value={status} onChange={handleStatusChange} className={css.statusDropdown} />
        <Button size="small" variant="outline" color="secondary" disabled={index === 0} onClick={() => setStatus(STATUSES[index - 1])}>
          이전 단계
        </Button>
        <Button
          size="small"
          variant="outline"
          color="secondary"
          disabled={index === STATUSES.length - 1}
          onClick={() => setStatus(STATUSES[index + 1])}
        >
          다음 단계
        </Button>
        <Button size="small" variant="outline" color="secondary" iconLeft={<Icon name="refreshCw" size="sm" />} onClick={() => setReplayCount(replayCount + 1)}>
          다시 재생
        </Button>
      </div>

      <Callout intent="info" title="D. 링 게이지 요약형 (채택)">
        실제 계약 상세의 LifecycleRing 을 그대로 렌더합니다. 게이지에 마우스를 올리면 지난·남은 단계 Popover, 아래 막대에 올리면 Tooltip.
      </Callout>

      <div>
        <header className={cd.hero}>
          <div>
            <div className={cd.heroTitleRow}>
              <Icon name="lock" size="sm" className={cd.lockIcon} />
              <h1 className={cd.heroTitle}>공동연구개발 협약</h1>
              <StatusBadge status={getStatusLabel(status)} />
            </div>
            <div className={cd.hmeta}>
              <span className={cd.hcode}>C20260912-9719</span>
              <span className={cd.sep}>|</span>
              <span>신규계약</span>
              <span className={cd.sep}>|</span>
              <span>등록 2026-09-12</span>
            </div>
          </div>
          <div className={cd.heroActions}>
            <Button variant="outline" color="secondary" size="medium">
              미리보기
            </Button>
            <Button size="medium">코멘트 추가</Button>
          </div>
        </header>
        <div className={cd.glance}>
          {GLANCE.map((g) => (
            <div key={g.label} className={cd.gcell}>
              <div className={cd.gl}>{g.label}</div>
              <div className={cd.gv}>{g.value}</div>
            </div>
          ))}
        </div>
      </div>

      <LifecycleRing key={replayCount} progress={progress} />

      <div className={`${cd.railGrid} ${css.ghostWrap}`} aria-hidden="true">
        <section className={cd.card}>
          <header className={cd.chead}>AI 계약 리스크</header>
          <div className={css.ghostBody} />
        </section>
        <section className={cd.card}>
          <header className={cd.chead}>결재 현황</header>
          <div className={css.ghostBody} />
        </section>
      </div>
    </div>
  );
};
