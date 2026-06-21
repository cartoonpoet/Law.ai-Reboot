import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Icon, Button, Avatar } from "@lawkit/ui";
import { T } from "../../design/tokens";
import { Panel } from "../../components/ui/Panel";
import { Tag } from "../../components/ui/Tag";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { LIFECYCLE, RISKS, COMMENTS } from "./mock-data";
import type { LifecycleStep, Risk } from "./mock-data";
import { getContract } from "../../api/contracts";
import { toDetailView } from "./toDetailView";
import { getStatusLabel } from "./contractStatus";
import { useContractStatus } from "./hooks/useContractStatus";
import * as dcss from "./contractDetail.css";

function LifecycleRail({ steps }: { steps: LifecycleStep[] }) {
  const last = steps.length - 1;
  return (
    <div style={{ display: "flex", alignItems: "flex-start", overflowX: "auto", padding: "4px 2px 2px" }}>
      {steps.map((s, i) => {
        const done = s.status === "completed";
        const act = s.status === "active";
        return (
          <div key={i} style={{ flex: 1, minWidth: 72, position: "relative", textAlign: "center", paddingTop: 3 }}>
            {i > 0 && <div style={{ position: "absolute", left: 0, right: "50%", top: 12, height: 2, background: done || act ? T.primary : T.border }} />}
            {i < last && <div style={{ position: "absolute", left: "50%", right: 0, top: 12, height: 2, background: done ? T.primary : T.border }} />}
            <div style={{ position: "relative", width: 22, height: 22, margin: "0 auto", borderRadius: 999, background: done ? T.primary : "#fff", border: `2px solid ${done || act ? T.primary : T.borderStrong}`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: act ? `0 0 0 4px ${T.primarySoft}` : "none" }}>
              {done && <Icon name="check" size="sm" style={{ width: 12, height: 12, color: "#fff" }} />}
              {act && <span style={{ width: 8, height: 8, borderRadius: 999, background: T.primary }} />}
            </div>
            <div style={{ marginTop: 8, fontSize: 11, fontWeight: act ? 700 : 500, color: act ? T.heading : done ? T.body : T.faint, whiteSpace: "nowrap" }}>{s.label}</div>
          </div>
        );
      })}
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: T.faint, fontWeight: 600, marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: 13.5, color: T.heading, fontWeight: 600 }}>{children}</div>
    </div>
  );
}

const RISK_LEVEL = {
  high: { c: T.danger, bg: "#fbeaea", label: "고위험" },
  mid: { c: T.warningDark, bg: "#f8ead0", label: "주의" },
  low: { c: T.muted, bg: "#eef0f4", label: "참고" },
} as const;

function RiskCard({ r }: { r: Risk }) {
  const L = RISK_LEVEL[r.level];
  return (
    <div style={{ border: `1px solid ${T.border}`, borderLeft: `3px solid ${L.c}`, borderRadius: 7, padding: "12px 14px", background: T.surface }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 10.5, fontWeight: 800, color: L.c, background: L.bg, padding: "1px 7px", borderRadius: 4 }}>{L.label}</span>
        <span style={{ fontSize: 13.5, fontWeight: 700, color: T.heading }}>{r.clause}</span>
      </div>
      <div style={{ fontSize: 12.5, color: T.body, lineHeight: 1.55, marginBottom: 7 }}>{r.finding}</div>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 6, padding: "7px 10px", background: T.primaryTint, borderRadius: 5 }}>
        <Icon name="autoAwesome" size="sm" style={{ width: 13, height: 13, color: T.primary, marginTop: 1, flexShrink: 0 }} />
        <span style={{ fontSize: 12, color: T.primaryDark, fontWeight: 600, lineHeight: 1.5 }}>{r.suggest}</span>
      </div>
    </div>
  );
}

function KVRow({ label, children, last }: { label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div style={{ display: "flex", borderBottom: last ? "none" : `1px solid ${T.border}` }}>
      <div style={{ width: 130, flexShrink: 0, padding: "11px 14px", background: T.surfaceAlt, fontSize: 12.5, color: T.muted, fontWeight: 600 }}>{label}</div>
      <div style={{ flex: 1, padding: "11px 14px", fontSize: 13, color: T.heading }}>{children}</div>
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

  if (!data) {
    return (
      <Panel pad={18}>
        {isLoading ? "불러오는 중…" : "계약을 찾을 수 없습니다."}
      </Panel>
    );
  }

  const d = toDetailView(data);
  // 버튼 가시성은 백엔드가 내려준 data.can에서 파생(권한 정보 없으면 보수적으로 숨김).
  const canEdit = Boolean(data.can?.edit);
  // transition 권한은 반려(requesterReview)·검토 완료(reviewDone) 양방향 전이를 함께 의미한다(MVP: 단일 플래그).
  const canTransition = Boolean(data.can?.transition);
  const riskHigh = RISKS.filter((r) => r.level === "high").length;
  const visibleComments = COMMENTS.filter((c) => !c.system).length;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 16 }}>
        <div>
          <button onClick={() => navigate("/contract/list")} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", color: T.muted, fontSize: 12, fontWeight: 600, fontFamily: "Pretendard", marginBottom: 8, padding: 0 }}>
            <Icon name="chevronLeft" size="sm" style={{ width: 13, height: 13 }} />계약서 검토 조회
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {d.secure && <Icon name="lock" size="sm" style={{ width: 16, height: 16, color: T.warningDark }} />}
            <h1 style={{ margin: 0, fontSize: 23, fontWeight: 800, color: T.heading, letterSpacing: "-0.025em" }}>{d.name}</h1>
            <StatusBadge status={d.status} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, fontSize: 12.5, color: T.muted }}>
            <span style={{ fontVariantNumeric: "tabular-nums" }}>{d.id}</span>
            <span style={{ color: T.border }}>|</span><span>{d.stage}</span>
            <span style={{ color: T.border }}>|</span><span>요청자 {d.requester}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          {canEdit && (
            <Button variant="outline" color="secondary" iconLeft={<Icon name="edit" size="sm" className={dcss.btnIcon} />} onClick={() => navigate(`/contract/${id}/edit`)}>수정</Button>
          )}
          <Button iconLeft={<Icon name="messageSquare" size="sm" style={{ width: 14, height: 14 }} />}>코멘트 추가</Button>
        </div>
      </div>

      <Panel pad={16} style={{ marginBottom: 16 }}>
        <LifecycleRail steps={LIFECYCLE} />
      </Panel>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 332px", gap: 18, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18, minWidth: 0 }}>
          <Panel title="검토 요약" icon="factCheck" pad={18}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "18px 20px" }}>
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
            <div style={{ marginTop: 18, paddingTop: 16, borderTop: `1px solid ${T.border}` }}>
              <div style={{ fontSize: 11, color: T.faint, fontWeight: 600, marginBottom: 6 }}>계약의 배경 및 목적</div>
              <p style={{ margin: 0, fontSize: 13, color: T.body, lineHeight: 1.65 }}>{d.purpose}</p>
            </div>
          </Panel>

          <Panel title="AI 계약 리스크" icon="autoAwesome"
            actions={<span style={{ fontSize: 11.5, color: T.muted }}><b style={{ color: T.danger }}>고위험 {riskHigh}</b> · 총 {RISKS.length}건 감지</span>}>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {RISKS.map((r, i) => <RiskCard key={i} r={r} />)}
            </div>
            <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 7, fontSize: 11.5, color: T.faint }}>
              <Icon name="info" size="sm" style={{ width: 13, height: 13 }} />AI가 표준계약서·과거 검토 이력과 대조해 분석한 결과입니다. 최종 판단은 검토자에게 있습니다.
            </div>
          </Panel>

          <Panel title="검토 의견" icon="messageSquare" badge={visibleComments} pad={16}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {COMMENTS.map((c, i) => c.system ? (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                  <div style={{ height: 1, flex: 1, background: T.border }} />
                  <span style={{ fontSize: 11.5, color: T.faint, whiteSpace: "nowrap" }}>{c.text} · {c.time.slice(11)}</span>
                  <div style={{ height: 1, flex: 1, background: T.border }} />
                </div>
              ) : (
                <div key={i} style={{ display: "flex", gap: 11 }}>
                  <Avatar initials={c.who[0]} size="sm" color={c.role === "법무팀" ? "primary" : "secondary"} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: T.heading }}>{c.who}</span>
                      <Tag color={c.role === "법무팀" ? "primary" : "neutral"}>{c.role}</Tag>
                      <span style={{ fontSize: 11.5, color: T.faint, fontVariantNumeric: "tabular-nums" }}>{c.time}</span>
                    </div>
                    <div style={{ fontSize: 13, color: T.body, lineHeight: 1.6, background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 13px" }}>{c.text}</div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Panel title="검토 액션" icon="factCheck" pad={16}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12.5, color: T.muted }}>현재 단계</span>
                <StatusBadge status={getStatusLabel(data.status)} size="sm" />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <Avatar initials={d.owner[0]} size="sm" color="primary" />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.heading }}>{d.owner} <span style={{ fontSize: 11.5, color: T.faint, fontWeight: 500 }}>법무팀</span></div>
                  <div style={{ fontSize: 11.5, color: T.muted }}>검토 담당</div>
                </div>
              </div>
              <div style={{ height: 1, background: T.border }} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {canTransition && (
                  <>
                    <Button size="medium" color="danger" variant="outline" disabled={isUpdating} onClick={() => changeStatus("requesterReview")}>반려</Button>
                    <Button size="medium" disabled={isUpdating} onClick={() => changeStatus("reviewDone")}>검토 완료</Button>
                  </>
                )}
              </div>
            </div>
          </Panel>

          <Panel title="핵심 정보" icon="info" pad={0}>
            <KVRow label="관리번호">{d.id}</KVRow>
            <KVRow label="계약 단계">{d.stage}</KVRow>
            <KVRow label="보안 여부">{d.secure ? <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: T.warningDark, fontWeight: 700 }}><Icon name="lock" size="sm" style={{ width: 12, height: 12 }} />보안</span> : "일반"}</KVRow>
            <KVRow label="참조 부서" last>{d.ccDept.join(", ")}</KVRow>
          </Panel>

          <Panel title="첨부 파일" icon="paperclip" badge={d.files.length} pad={12}>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {d.files.map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", border: `1px solid ${T.border}`, borderRadius: 7 }}>
                  <Icon name="fileText" size="sm" style={{ width: 18, height: 18, color: T.primary, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: T.heading, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.name}</div>
                    <div style={{ fontSize: 11, color: T.faint }}>{f.kind} · {f.meta}</div>
                  </div>
                  <Icon name="download" size="sm" style={{ width: 15, height: 15, color: T.muted, flexShrink: 0 }} />
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
