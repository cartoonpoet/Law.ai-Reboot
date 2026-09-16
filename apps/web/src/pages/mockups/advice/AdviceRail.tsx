import { Button, Card, Icon } from "@lawkit/ui";
import * as css from "../../contract/contractRequest.css";

// 결재선 — 계약 요청 폼의 레일 패널과 같은 구성(기안 → 승인).
const APPROVERS = [
  { step: "기안", name: "손준호", dept: "개발팀" },
  { step: "승인", name: "김법무", dept: "법무팀" },
];

const approvalHeader = (
  <span className={css.railHead}>
    <Icon name="factCheck" size="sm" className={css.railHeadIcon} />
    결재선
  </span>
);

const aiHeader = (
  <span className={css.railHead}>
    <Icon name="autoAwesome" size="sm" className={css.railHeadIcon} />
    AI 사전 확인
  </span>
);

/** 자문 요청 우측 레일 — 결재선과 AI 안내. */
export function AdviceRail() {
  return (
    <div className={css.rail}>
      <Card
        bordered
        header={approvalHeader}
        headerActions={<Button type="button" size="small" variant="outline" color="secondary">결재자 추가</Button>}
      >
        <div className={css.apprList}>
          {APPROVERS.map((approver) => (
            <div key={approver.step} className={css.apprRow}>
              <div className={css.apprMain}>
                <div className={css.apprName}>{approver.name}</div>
                <div className={css.apprDept}>{approver.step} · {approver.dept}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card bordered header={aiHeader}>
        <p className={css.aiNotice}>
          비슷한 지난 자문 2건과 관련 사내 규정 1건이 있어요. 요청 전에 먼저 확인하면 답이 이미 있을 수 있습니다.
        </p>
      </Card>
    </div>
  );
}
