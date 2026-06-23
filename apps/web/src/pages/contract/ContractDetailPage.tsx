import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Icon, Button, Avatar, StepBar } from "@lawkit/ui";
import { AssignModal } from "./sections/AssignModal";
import { CommentPanel } from "./sections/CommentPanel";
import { ContractDetailSkeleton } from "./sections/ContractDetailSkeleton";
import { Panel } from "../../components/ui/Panel";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { LIFECYCLE, RISKS } from "./mock-data";
import type { Risk } from "./mock-data";
import { getContract } from "../../api/contracts";
import { toDetailView } from "./toDetailView";
import { getStatusLabel } from "./contractStatus";
import { useContractStatus } from "./hooks/useContractStatus";
import { cx } from "@lawkit/ui";
import * as dcss from "./contractDetail.css";

// 위험도별 라벨·스타일 클래스(틴트/보더 색은 css.ts color-mix 토큰).
const RISK_LEVEL = {
  high: { label: "고위험", card: dcss.riskCardHigh, badge: dcss.riskBadgeHigh },
  mid: { label: "주의", card: dcss.riskCardMid, badge: dcss.riskBadgeMid },
  low: { label: "참고", card: dcss.riskCardLow, badge: dcss.riskBadgeLow },
} as const;

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className={dcss.factLabel}>{label}</div>
      <div className={dcss.factValue}>{children}</div>
    </div>
  );
}

function RiskCard({ r }: { r: Risk }) {
  const level = RISK_LEVEL[r.level];
  return (
    <div className={cx(dcss.riskCard, level.card)}>
      <div className={dcss.riskHead}>
        <span className={cx(dcss.riskBadge, level.badge)}>{level.label}</span>
        <span className={dcss.riskClause}>{r.clause}</span>
      </div>
      <div className={dcss.riskFinding}>{r.finding}</div>
      <div className={dcss.riskSuggest}>
        <Icon name="autoAwesome" size="sm" className={dcss.riskSuggestIcon} />
        <span className={dcss.riskSuggestText}>{r.suggest}</span>
      </div>
    </div>
  );
}

function KVRow({ label, children, last }: { label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div className={cx(dcss.kvRow, last && dcss.kvRowLast)}>
      <div className={dcss.kvLabel}>{label}</div>
      <div className={dcss.kvValue}>{children}</div>
    </div>
  );
}

export function ContractDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["contract", id],
    queryFn: () => getContract(id),
    enabled: Boolean(id),
  });
  const { changeStatus, isUpdating } = useContractStatus(id);
  const [isAssignOpen, setIsAssignOpen] = useState(false);

  if (isLoading) return <ContractDetailSkeleton />;
  if (!data) return <Panel pad={18}>계약을 찾을 수 없습니다.</Panel>;

  const d = toDetailView(data);
  // 버튼 가시성은 백엔드가 내려준 data.can에서 파생(권한 정보 없으면 보수적으로 숨김).
  const canEdit = Boolean(data.can?.edit);
  // transition 권한은 반려(requesterReview)·검토 완료(reviewDone) 양방향 전이를 함께 의미한다(MVP: 단일 플래그).
  const canTransition = Boolean(data.can?.transition);
  // 배정 권한(미배정 계약 첫 배정 포함)도 백엔드 can.assign에서 파생.
  const canAssign = Boolean(data.can?.assign);
  const handleAssign = (ownerId: string) => {
    changeStatus("assigning", ownerId);
    setIsAssignOpen(false);
  };
  const riskHigh = RISKS.filter((r) => r.level === "high").length;

  return (
    <div>
      <header className={dcss.header}>
        <div>
          <button type="button" className={dcss.backButton} onClick={() => navigate("/contract/list")}>
            <Icon name="chevronLeft" size="sm" className={dcss.backIcon} />계약서 검토 조회
          </button>
          <div className={dcss.titleRow}>
            {d.secure && <Icon name="lock" size="sm" className={dcss.lockIcon} />}
            <h1 className={dcss.title}>{d.name}</h1>
            <StatusBadge status={d.status} />
          </div>
          <div className={dcss.meta}>
            <span className={dcss.metaCode}>{d.id}</span>
            <span className={dcss.metaSep}>|</span><span>{d.stage}</span>
            <span className={dcss.metaSep}>|</span><span>요청자 {d.requester}</span>
          </div>
        </div>
        <div className={dcss.headerActions}>
          {canEdit && (
            <Button variant="outline" color="secondary" iconLeft={<Icon name="edit" size="sm" className={dcss.btnIcon} />} onClick={() => navigate(`/contract/${id}/edit`)}>수정</Button>
          )}
        </div>
      </header>

      <div className={dcss.lifecycleCard}>
        <Panel pad={16}>
          <StepBar steps={LIFECYCLE} />
        </Panel>
      </div>

      <div className={dcss.layout}>
        <div className={dcss.mainColumn}>
          <Panel title="검토 요약" icon="factCheck" pad={18}>
            <div className={dcss.factGrid}>
              <Fact label="계약 당사자">{d.catPath[0]}</Fact>
              <Fact label="계약 분류">{d.catPath.join(" › ")}</Fact>
              <Fact label="계약 언어">{d.lang} · {d.legalCat}</Fact>
              <Fact label="계약 기간">{d.period}</Fact>
              <Fact label="상대 계약자">{d.counter}</Fact>
              <Fact label="검토 요청자">{d.requester}</Fact>
              <Fact label="계약 규모">{d.amount.contract}</Fact>
              <Fact label="협상력">{d.negotiation}%</Fact>
              <Fact label="계약서 유형">{d.type}</Fact>
            </div>
            <div className={dcss.purposeBlock}>
              <div className={dcss.purposeLabel}>계약의 배경 및 목적</div>
              <p className={dcss.purposeText}>{d.purpose}</p>
            </div>
          </Panel>

          <Panel title="AI 계약 리스크" icon="autoAwesome"
            actions={<span className={dcss.riskActions}><b className={dcss.riskActionsHigh}>고위험 {riskHigh}</b> · 총 {RISKS.length}건 감지</span>}>
            <div className={dcss.riskList}>
              {RISKS.map((r, i) => <RiskCard key={i} r={r} />)}
            </div>
            <div className={dcss.riskFootnote}>
              <Icon name="info" size="sm" className={dcss.footnoteIcon} />AI가 표준계약서·과거 검토 이력과 대조해 분석한 결과입니다. 최종 판단은 검토자에게 있습니다.
            </div>
          </Panel>

          <CommentPanel contractId={id} />
        </div>

        <div className={dcss.sideColumn}>
          <Panel title="검토 액션" icon="factCheck" pad={16}>
            <div className={dcss.actionStack}>
              <div className={dcss.stageRow}>
                <span className={dcss.stageLabel}>현재 단계</span>
                <StatusBadge status={getStatusLabel(data.status)} size="sm" />
              </div>
              <div className={dcss.ownerRow}>
                <Avatar initials={d.owner[0]} size="sm" color="primary" />
                <div className={dcss.ownerInfo}>
                  <div className={dcss.ownerName}>{d.owner}{d.ownerDept && <span className={dcss.ownerDept}> {d.ownerDept}</span>}</div>
                  <div className={dcss.ownerRole}>검토 담당</div>
                </div>
              </div>
              <div className={dcss.divider} />
              {canTransition && (
                <div className={dcss.transitionGrid}>
                  <Button size="medium" color="danger" variant="outline" disabled={isUpdating} onClick={() => changeStatus("requesterReview")}>반려</Button>
                  <Button size="medium" disabled={isUpdating} onClick={() => changeStatus("reviewDone")}>검토 완료</Button>
                </div>
              )}
              {canAssign && (
                <Button size="medium" variant="outline" iconLeft={<Icon name="user" size="sm" />} disabled={isUpdating} onClick={() => setIsAssignOpen(true)}>담당자 배정</Button>
              )}
            </div>
          </Panel>

          <Panel title="참여자" icon="user" pad={16}>
            <div className={dcss.partyStack}>
              <div className={dcss.partyRow}>
                <Avatar initials={d.requester[0]} size="sm" color="info" />
                <div className={dcss.partyInfo}>
                  <div className={dcss.partyName}>{d.requester}</div>
                  <div className={dcss.partyRole}>검토 요청자</div>
                </div>
              </div>
              <div className={dcss.partyRow}>
                <Avatar initials={d.owner[0]} size="sm" color="primary" />
                <div className={dcss.partyInfo}>
                  <div className={dcss.partyName}>{d.owner}</div>
                  <div className={dcss.partyRole}>검토 담당{d.ownerDept ? ` · ${d.ownerDept}` : ""}</div>
                </div>
              </div>
            </div>
          </Panel>

          <Panel title="핵심 정보" icon="info" pad={0}>
            <KVRow label="관리번호">{d.id}</KVRow>
            <KVRow label="계약 단계">{d.stage}</KVRow>
            <KVRow label="보안 여부">{d.secure ? <span className={dcss.secureValue}><Icon name="lock" size="sm" className={dcss.secureIcon} />보안</span> : "일반"}</KVRow>
            <KVRow label="참조 부서" last>{d.ccDept.join(", ")}</KVRow>
          </Panel>

          <Panel title="첨부 파일" icon="paperclip" badge={d.files.length} pad={12}>
            <div className={dcss.fileList}>
              {d.files.map((f, i) => (
                <div key={i} className={dcss.fileItem}>
                  <Icon name="fileText" size="sm" className={dcss.fileIcon} />
                  <div className={dcss.fileInfo}>
                    <div className={dcss.fileName}>{f.name}</div>
                    <div className={dcss.fileMeta}>{f.kind} · {f.meta}</div>
                  </div>
                  <Icon name="download" size="sm" className={dcss.fileDownload} />
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      {isAssignOpen && (
        <AssignModal
          onClose={() => setIsAssignOpen(false)}
          onAssign={handleAssign}
          isAssigning={isUpdating}
        />
      )}
    </div>
  );
}
