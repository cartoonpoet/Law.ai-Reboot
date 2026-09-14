import { useState } from "react";
import type { ReactNode } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Icon, Button, ProgressBar, Alert } from "@lawkit/ui";
import type { ApproverSnapshot } from "@lawai/contracts";
import {
  FilePreviewModal,
  type PreviewFileRef,
} from "../../components/filePreview";
import { AssignModal } from "./sections/AssignModal";
import { CommentPanel } from "./sections/CommentPanel";
import { ReviewActionPanel } from "./sections/ReviewActionPanel";
import { ApprovalRejectModal } from "./sections/ApprovalRejectModal";
import { ApprovalStepRows } from "./sections/ApprovalStepRows";
import { ContractDetailSkeleton } from "./sections/ContractDetailSkeleton";
import { StatusBadge } from "../../components/ui/StatusBadge";
import type { ContractDetail, ApprovalStepView } from "./mock-data";
import { AiRiskCard } from "./sections/AiRiskCard";
import { getContract } from "../../api/contracts";
import { toDetailView } from "./toDetailView";
import { getLifecycleProgress } from "./getLifecycleProgress";
import { LifecycleRing } from "./sections/LifecycleRing";
import { getSubmitPrecheck } from "./getSubmitPrecheck";
import { useContractStatus } from "./hooks/useContractStatus";
import { useContractApproval } from "./hooks/useContractApproval";
import { useMe } from "../../components/layout/hooks/useMe";
import { cx } from "./cx";
import * as css from "./contractDetail.css";

/* ── 작은 표시 헬퍼(SRP: 뷰 조각) ── */

function EmptyChip() {
  return <span className={css.emptychip}>없음</span>;
}

function NeedChip() {
  return (
    <span className={css.needchip}>
      <Icon name="alertTriangle" size="sm" className={css.needchipIcon} />
      미배정
    </span>
  );
}

function Fact({
  label,
  span,
  children,
}: {
  label: string;
  span?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={span ? cx(css.fact, css.span2) : css.fact}>
      <div className={css.fl}>{label}</div>
      <div className={css.fv}>{children}</div>
    </div>
  );
}

function Rblock({ title, text }: { title: string; text: string | null }) {
  return (
    <div className={css.rblock}>
      <div className={css.rbt}>{title}</div>
      <div className={css.rbtxt}>{text ?? <EmptyChip />}</div>
    </div>
  );
}

function Gauge({ value }: { value: number }) {
  return (
    <span className={css.gauge}>
      <span className={css.gbar}>
        <ProgressBar value={value} color="primary" />
      </span>
      <span className={css.gaugeVal}>{value}%</span>
    </span>
  );
}

/* ── glance strip ── */

function GlanceStrip({ d }: { d: ContractDetail }) {
  return (
    <div className={css.glance}>
      <div className={css.gcell}>
        <div className={css.gl}>상대 계약자</div>
        <div className={css.gv}>{d.counter}</div>
      </div>
      <div className={css.gcell}>
        <div className={css.gl}>계약 분류</div>
        <div className={css.gv}>{d.catPath.join(" · ") || "-"}</div>
      </div>
      <div className={css.gcell}>
        <div className={css.gl}>계약 기간</div>
        <div className={css.gv}>{d.period}</div>
      </div>
      <div className={css.gcell}>
        <div className={css.gl}>실 지급액</div>
        <div className={css.gv}>{d.amount.total}</div>
      </div>
      <div className={css.gcell}>
        <div className={css.gl}>협상력</div>
        <div className={css.gv}>
          <Gauge value={d.negotiation} />
        </div>
      </div>
      <div className={css.gcell}>
        <div className={css.gl}>법무 담당자</div>
        <div className={cx(css.gv, css.gvWarn)}>
          {d.owner === "미배정" ? <NeedChip /> : d.owner}
        </div>
      </div>
    </div>
  );
}

/* ── 결재선 카드 ── */

const PLANNED_TYPE_LABEL: Record<ApproverSnapshot["type"], string> = {
  draft: "기안",
  approve: "결재",
  agree: "합의",
  refer: "참조",
};

function ApprovalLineCard({
  steps,
  plannedApprovers,
}: {
  steps: ApprovalStepView[] | null;
  plannedApprovers: ApproverSnapshot[];
}) {
  // 활성 결재 라인(상신됨)이 있으면 그걸, 없으면 상신 전 결재선(plannedApprovers)을 보여준다.
  const hasActiveLine = Boolean(steps && steps.length > 0);
  const hasPlanned = !hasActiveLine && plannedApprovers.length > 0;

  return (
    <section className={css.card}>
      <header className={css.chead}>
        <Icon name="checkCircle" size="sm" className={css.cheadIconMuted} />
        결재선
        {hasActiveLine && <span className={css.cheadNote}>기안 1순위 고정</span>}
        {hasPlanned && <span className={css.cheadNote}>예정 · 상신 전</span>}
      </header>
      <div className={css.cbody}>
        {hasActiveLine && <ApprovalStepRows steps={steps!} currentStepExtra={null} />}
        {hasPlanned &&
          plannedApprovers.map((a, i) => (
            <div key={`${a.name}-${i}`} className={css.apvrow}>
              <span className={css.apvnum}>{i + 1}</span>
              <span>
                <span className={css.apvname}>{a.name}</span>
                <span className={css.apvdept}>{a.dept}</span>
              </span>
              <span className={cx(css.apvtype, css.apvtypeKind[a.type])}>
                {PLANNED_TYPE_LABEL[a.type]}
              </span>
            </div>
          ))}
        {!hasActiveLine && !hasPlanned && (
          <p className={css.docEmpty}>등록된 결재선이 없습니다.</p>
        )}
      </div>
    </section>
  );
}

/* ── 문서 카드(우측 레일) ── */

type DocFile = ContractDetail["files"][number];

interface DocFileRowProps {
  file: DocFile;
  showCompare?: boolean;
  onPreview: (file: DocFile) => void;
  onCompare?: (file: DocFile) => void;
}

function DocFileRow({ file, showCompare, onPreview, onCompare }: DocFileRowProps) {
  const enabled = file.hasStorage;
  const disabledTitle = "미리보기/비교는 R2 업로드된 파일만 가능 (업로드 흐름은 후속 PR)";
  return (
    <div className={css.docFileRow}>
      <Icon name="fileText" size="sm" className={css.fileIcon} />
      <div className={css.docFileMain}>
        <div className={css.docFileName}>{file.name}</div>
        <div className={css.docFileLinks}>
          <button
            type="button"
            className={enabled ? css.flink : cx(css.flink, css.flinkDisabled)}
            disabled={!enabled}
            title={enabled ? undefined : disabledTitle}
            onClick={() => enabled && onPreview(file)}
          >
            미리보기
          </button>
          {showCompare && (
            <button
              type="button"
              className={
                enabled
                  ? cx(css.flink, css.flinkGreen)
                  : cx(css.flink, css.flinkDisabled)
              }
              disabled={!enabled}
              title={enabled ? undefined : disabledTitle}
              onClick={() => enabled && onCompare?.(file)}
            >
              문서 비교
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// DocFile → PreviewFileRef (id 가 있는 것만 — 호출 전 hasStorage 가드로 안전).
const toPreviewRef = (f: DocFile): PreviewFileRef => ({
  id: f.id!,
  name: f.name,
  mimeType: f.mimeType,
});

function DocsCard({ d, contractId }: { d: ContractDetail; contractId: string }) {
  // 서명본은 계약서보다 위(체결 완료 계약에서 가장 권위 있는 문서). 없으면 블록 자체를 렌더하지 않는다
  // (검토 단계 계약은 서명본이 없는 게 정상 — 빈 섹션을 만들지 않는다).
  const signeds = d.files.filter((f) => f.kind === "서명본");
  const contracts = d.files.filter((f) => f.kind === "계약서");
  const attachs = d.files.filter((f) => f.kind === "첨부");
  const refs = d.files.filter((f) => f.kind === "참고");

  // 미리보기 상태 — DocsCard 가 모달 owner. previewBId 가 있으면 좌우 분할.
  const [previewAId, setPreviewAId] = useState<string | null>(null);
  const [previewBId, setPreviewBId] = useState<string | null>(null);

  const previewableFiles = d.files.filter((f) => f.hasStorage && f.id);
  const candidates = previewableFiles.map(toPreviewRef);

  const handlePreview = (file: DocFile) => {
    setPreviewAId(file.id);
    setPreviewBId(null);
  };

  // 비교 — 기본 B 는 같은 그룹의 다른 첫 파일(없으면 어떤 그룹이든 다른 첫 파일).
  const handleCompare = (file: DocFile) => {
    const sameGroup = previewableFiles.find(
      (f) => f.id !== file.id && f.kind === file.kind,
    );
    const fallback = previewableFiles.find((f) => f.id !== file.id);
    const b = sameGroup ?? fallback;
    if (!b) {
      window.alert("비교할 다른 파일이 없습니다.");
      return;
    }
    setPreviewAId(file.id);
    setPreviewBId(b.id);
  };

  const fileA =
    previewableFiles.find((f) => f.id === previewAId) ?? null;
  const fileB =
    previewableFiles.find((f) => f.id === previewBId) ?? null;

  return (
    <section className={css.card}>
      <header className={css.chead}>
        <Icon name="paperclip" size="sm" className={css.cheadIconMuted} />
        문서
      </header>
      <div className={cx(css.cbody, css.docGroup)}>
        {signeds.length > 0 && (
          <div>
            <div className={css.docGroupLabel}>서명본</div>
            {signeds.map((f, i) => (
              <DocFileRow
                key={f.id ?? `signed-${i}`}
                file={f}
                showCompare
                onPreview={handlePreview}
                onCompare={handleCompare}
              />
            ))}
          </div>
        )}
        <div>
          <div className={css.docGroupLabel}>
            계약서 <span className={css.minitag}>필수</span>
          </div>
          {contracts.length > 0 ? (
            contracts.map((f, i) => (
              <DocFileRow
                key={i}
                file={f}
                showCompare
                onPreview={handlePreview}
                onCompare={handleCompare}
              />
            ))
          ) : (
            <div className={css.docEmpty}>등록된 계약서가 없습니다.</div>
          )}
        </div>
        <div>
          <div className={css.docGroupLabel}>첨부 · 별첨</div>
          {attachs.length > 0 ? (
            attachs.map((f, i) => (
              <DocFileRow key={i} file={f} onPreview={handlePreview} />
            ))
          ) : (
            <div className={css.docEmpty}>첨부된 파일이 없습니다.</div>
          )}
        </div>
        <div>
          <div className={css.docGroupLabel}>참고서류</div>
          {refs.length > 0 ? (
            refs.map((f, i) => (
              <DocFileRow key={i} file={f} onPreview={handlePreview} />
            ))
          ) : (
            <div className={css.docEmpty}>등록된 참고서류가 없습니다.</div>
          )}
        </div>
      </div>

      {fileA && (
        <FilePreviewModal
          open
          fileA={toPreviewRef(fileA)}
          fileB={fileB ? toPreviewRef(fileB) : null}
          candidates={candidates}
          contractId={contractId}
          onChangeFileB={setPreviewBId}
          onClose={() => {
            setPreviewAId(null);
            setPreviewBId(null);
          }}
        />
      )}
    </section>
  );
}

/* ── 페이지 ── */

export function ContractDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  // 제출(신규 작성/수정) 직후 일부 단계(업로드·finalize)가 실패했을 때만 useContractSubmit 이
  // navigate(state) 로 넘긴다 — 그 페이지는 이 화면으로 넘어오며 즉시 unmount 돼 자기 화면에
  // 에러를 못 띄우므로, 여기서 대신 보여준다(안 그러면 사용자는 실패를 영영 모른다).
  const location = useLocation();
  const submitError = (location.state as { submitError?: string } | null)?.submitError ?? null;
  const { data, isLoading } = useQuery({
    queryKey: ["contract", id],
    queryFn: () => getContract(id),
    enabled: Boolean(id),
  });
  const { changeStatus, isUpdating } = useContractStatus(id);
  const { me } = useMe();
  const {
    submitApproval,
    isSubmitting,
    decideApproval,
    isDeciding,
  } = useContractApproval(id);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);

  // 로딩 중에는 재설계된 상세 레이아웃 형태의 스켈레톤(loading-state-convention: 상세=스켈레톤).
  if (isLoading) {
    return <ContractDetailSkeleton />;
  }

  if (!data) {
    return (
      <div className={css.page}>
        <div className={css.empty}>계약을 찾을 수 없습니다.</div>
      </div>
    );
  }

  const d = toDetailView(data);
  // 버튼 가시성은 백엔드 data.can 에서 파생(권한 없으면 보수적으로 숨김).
  const can = {
    edit: Boolean(data.can?.edit),
    assign: Boolean(data.can?.assign),
    transition: Boolean(data.can?.transition),
    delete: Boolean(data.can?.delete),
  };
  // 진행 게이지 — 실 status + 담당자·검토기한·결재선·체결일에서 파생.
  const lifecycle = getLifecycleProgress({
    status: data.status,
    ownerName: data.ownerName,
    dueDate: data.dueDate,
    signedAt: data.signedAt,
    period: d.period,
    approvalLine: data.approvalLine,
    now: new Date(),
  });

  // 체결 품의 컨텍스트 — 요청자 본인 여부(상신 주체) + 활성 라인의 현재 차례가 나인지.
  const myId = me?.id ?? null;
  const isRequester = Boolean(myId) && data.createdById === myId;
  const currentStep = data.approvalLine?.steps.find(
    (s) => s.id === data.approvalLine!.currentStepId,
  );
  const isMyTurn = Boolean(myId) && currentStep?.userId === myId;

  // 연간 금액(경고 판단용) — details.money 합산(통화 구분 없이 단순 합, 규칙 기반 권고이므로 근사치).
  const annualAmountKrw = data.details.money.some((m) => m.amount != null)
    ? data.details.money.reduce((sum, m) => sum + (m.amount ?? 0), 0)
    : null;
  const hasContractFile = data.files.some((f) => f.role === "contract");
  const precheck = getSubmitPrecheck({
    plannedApprovers: data.plannedApprovers,
    hasContractFile,
    annualAmountKrw,
  });

  const handleAssign = (ownerId: string) => {
    changeStatus("assigning", ownerId);
    setIsAssignOpen(false);
  };

  const handleRejectConfirm = (comment: string) => {
    if (!data.approvalLine) return;
    decideApproval(data.approvalLine.id, "reject", comment || undefined);
    setIsRejectOpen(false);
  };

  return (
    <div className={css.page}>
      <button
        type="button"
        className={css.backlink}
        onClick={() => navigate("/contract/list")}
      >
        <Icon name="chevronLeft" size="sm" className={css.backIcon} />
        계약 조회
      </button>

      {/* lawkit Alert 는 warning/error 타입이 없다(info/confirm/secret/saveTemporarily 뿐) —
          기존 컨벤션대로 info 로 대체한다. */}
      {submitError && (
        <Alert type="info" size="small">
          {submitError}
        </Alert>
      )}

      {/* hero */}
      <header className={css.hero}>
        <div>
          <div className={css.heroTitleRow}>
            {d.secure && <Icon name="lock" size="sm" className={css.lockIcon} />}
            <h1 className={css.heroTitle}>{d.name}</h1>
            <StatusBadge status={d.status} />
          </div>
          <div className={css.hmeta}>
            <span className={css.hcode}>{d.id}</span>
            <span className={css.sep}>|</span>
            <span>{d.stage}</span>
            <span className={css.sep}>|</span>
            <span>등록 {d.createdAt ?? "-"}</span>
          </div>
        </div>
        <div className={css.heroActions}>
          <Button variant="outline" color="secondary" size="medium">
            미리보기
          </Button>
          {can.edit && (
            <Button
              variant="outline"
              color="secondary"
              size="medium"
              iconLeft={<Icon name="edit" size="sm" className={css.btnIcon} />}
              onClick={() => navigate(`/contract/${id}/edit`)}
            >
              수정
            </Button>
          )}
          <Button size="medium">코멘트 추가</Button>
        </div>
      </header>

      {/* at-a-glance */}
      <GlanceStrip d={d} />

      {/* 진행 게이지(지난·남은 단계는 hover 팝오버) */}
      <LifecycleRing progress={lifecycle} />

      <div className={css.railGrid}>
        {/* 좌측 본문 stack */}
        <div className={css.stack}>
          {/* AI 계약 리스크(실동작 — 상태 기반 kind 폴링) */}
          <AiRiskCard contractId={id} status={data.status} />

          {/* 검토 내용 */}
          <section className={css.card}>
            <header className={css.chead}>
              <Icon name="list" size="sm" className={css.cheadIconMuted} />
              검토 내용
            </header>
            <div className={css.cbody}>
              <Rblock title="계약의 배경 및 목적" text={d.purpose || null} />
              <Rblock title="주요 협의사항" text={d.keyPoints} />
              <Rblock title="계약 지급 조건" text={d.payTerms || null} />
              <Rblock title="요청부서의 우려사항 및 기타 고려사항" text={d.notes || null} />
            </div>
          </section>

          {/* 기본 · 분류 */}
          <section className={css.card}>
            <header className={css.chead}>
              <Icon name="shield" size="sm" className={css.cheadIconMuted} />
              기본 · 분류
            </header>
            <div className={css.cbody}>
              <div className={css.facts}>
                <Fact label="보안 여부">
                  {d.secure ? <span className={css.gvWarn}>보안</span> : "일반"}
                </Fact>
                <Fact label="계약서 유형">{d.type}</Fact>
                <Fact label="계약 분류" span>
                  <span className={css.crumb}>
                    {d.catPath.length > 0 ? (
                      d.catPath.map((p, i) => (
                        <span key={i} className={css.crumbItem}>
                          {p}
                        </span>
                      ))
                    ) : (
                      <EmptyChip />
                    )}
                  </span>
                </Fact>
                <Fact label="계약 기간">{d.period}</Fact>
                <Fact label="계약예정일">
                  {d.dueDate ? d.dueDate.slice(0, 10) : <EmptyChip />}
                </Fact>
                <Fact label="계약 언어">{d.lang}</Fact>
                <Fact label="법무 분류">{d.legalCat}</Fact>
              </div>
            </div>
          </section>

          {/* 금액 · 협상 */}
          <section className={css.card}>
            <header className={css.chead}>
              <Icon name="pay" size="sm" className={css.cheadIconMuted} />
              금액 · 협상
            </header>
            <div className={css.cbody}>
              <div className={css.facts}>
                <Fact label="계약 규모(대가)" span>
                  <span className={css.moneyChips}>
                    <span className={cx(css.moneychip, css.moneychipColor.blue)}>
                      계약금액 {d.amount.contract} [부가세 별도]
                    </span>
                    <span className={cx(css.moneychip, css.moneychipColor.red)}>
                      세액 {d.amount.vat}
                    </span>
                    <span className={cx(css.moneychip, css.moneychipColor.green)}>
                      실 지급액 {d.amount.total}
                    </span>
                  </span>
                </Fact>
                <Fact label="금액 메모" span>
                  {d.moneyNote ?? <EmptyChip />}
                </Fact>
                <Fact label="계약상대방 협상력" span>
                  <Gauge value={d.negotiation} />
                </Fact>
              </div>
            </div>
          </section>

          {/* 당사자 · 관계자 */}
          <section className={css.card}>
            <header className={css.chead}>
              <Icon name="users" size="sm" className={css.cheadIconMuted} />
              당사자 · 관계자
            </header>
            <div className={css.cbody}>
              <div className={css.facts}>
                <Fact label="상대 계약자" span>
                  {d.counter}
                  {d.counterpartyBizNo && (
                    <span className={css.fvFaint}> ({d.counterpartyBizNo})</span>
                  )}
                </Fact>
                <Fact label="상대 대표/담당자">
                  {d.counterpartyRep ?? <EmptyChip />}
                </Fact>
                <Fact label="업무담당자">
                  {d.detailsOwner ? d.detailsOwner.name : <EmptyChip />}
                </Fact>
                <Fact label="검토 요청자">{d.requester}</Fact>
                <Fact label="법무팀 담당자">
                  {d.owner === "미배정" ? <NeedChip /> : d.owner}
                </Fact>
                <Fact label="참조수신자(사용자)">
                  {d.ccUser.length > 0 ? (
                    <span className={css.chipRow}>
                      {d.ccUser.map((u) => (
                        <span key={u.id} className={css.chipS}>
                          {u.name}
                        </span>
                      ))}
                    </span>
                  ) : (
                    <EmptyChip />
                  )}
                </Fact>
                <Fact label="참조수신자(비밀)">
                  {d.ccSecret.length > 0 ? (
                    <span className={css.chipRow}>
                      {d.ccSecret.map((u) => (
                        <span key={u.id} className={css.chipS}>
                          {u.name}
                        </span>
                      ))}
                    </span>
                  ) : (
                    <EmptyChip />
                  )}
                </Fact>
                <Fact label="참조수신자(부서)" span>
                  {d.ccDept.length > 0 ? (
                    <span className={css.chipRow}>
                      {d.ccDept.map((dept, i) => (
                        <span key={i} className={css.chipS}>
                          {dept}
                        </span>
                      ))}
                    </span>
                  ) : (
                    <EmptyChip />
                  )}
                </Fact>
                <Fact label="관련 프로젝트">
                  {d.project ? d.project.name : <EmptyChip />}
                </Fact>
                <Fact label="관련문서">
                  {d.relatedDocs.length > 0 ? (
                    <span className={css.linkList}>
                      {d.relatedDocs.map((doc) => (
                        <span key={doc.id}>{doc.name}</span>
                      ))}
                    </span>
                  ) : (
                    <EmptyChip />
                  )}
                </Fact>
                <Fact label="기타 URL" span>
                  {d.urls.length > 0 ? (
                    <span className={css.linkList}>
                      {d.urls.map((url, i) => (
                        <a
                          key={i}
                          className={css.flink}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {url}
                        </a>
                      ))}
                    </span>
                  ) : (
                    <EmptyChip />
                  )}
                </Fact>
              </div>
            </div>
          </section>

          {/* 비용(mock 빈 상태) */}
          <section className={css.card}>
            <header className={css.chead}>
              <Icon name="pay" size="sm" className={css.cheadIconMuted} />
              비용
            </header>
            <div className={css.cbody}>
              <Alert type="info" size="small">
                변호사를 먼저 선택하면 착수금·성공보수금을 입력할 수 있습니다.
              </Alert>
              <div className={css.empty}>등록된 비용 내역이 없습니다.</div>
            </div>
          </section>

          {/* 결재선 */}
          <ApprovalLineCard steps={d.approvalLine} plannedApprovers={data.plannedApprovers} />

          {/* 코멘트 · 이력 */}
          <CommentPanel contractId={id} />
        </div>

        {/* 우측 레일(sticky) */}
        <div className={cx(css.stack, css.sticky)}>
          <ReviewActionPanel
            contractId={id}
            status={data.status}
            can={can}
            ownerName={d.owner}
            approvalLine={d.approvalLine}
            signedAt={d.signedAt}
            isUpdating={isUpdating}
            onReject={() => changeStatus("requesterReview")}
            onReviewDone={() => changeStatus("reviewDone")}
            onStartReview={() => changeStatus("legalReview")}
            onAssign={() => setIsAssignOpen(true)}
            approval={{
              isRequester,
              isMyTurn,
              canSubmit: precheck.canSubmit,
              isApprovalComplete: data.approvalLine?.status === "approved",
            }}
            precheckItems={precheck.items}
            onSubmitApproval={submitApproval}
            isSubmitting={isSubmitting}
            onApproveStep={(comment) =>
              data.approvalLine &&
              decideApproval(data.approvalLine.id, "approve", comment || undefined)
            }
            onOpenRejectModal={() => setIsRejectOpen(true)}
            isDeciding={isDeciding}
          />
          <DocsCard d={d} contractId={id} />
        </div>
      </div>

      {isAssignOpen && (
        <AssignModal
          onClose={() => setIsAssignOpen(false)}
          onAssign={handleAssign}
          isAssigning={isUpdating}
        />
      )}

      {isRejectOpen && (
        <ApprovalRejectModal
          onClose={() => setIsRejectOpen(false)}
          onConfirm={handleRejectConfirm}
          isRejecting={isDeciding}
        />
      )}
    </div>
  );
}
