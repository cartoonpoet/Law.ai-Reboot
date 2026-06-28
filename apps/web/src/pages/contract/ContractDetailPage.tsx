import { useState } from "react";
import type { ReactNode } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Icon, Button, StepBar, ProgressBar, Alert } from "@lawkit/ui";
import {
  FilePreviewModal,
  type PreviewFileRef,
} from "../../components/filePreview";
import { AssignModal } from "./sections/AssignModal";
import { CommentPanel } from "./sections/CommentPanel";
import { ReviewActionPanel } from "./sections/ReviewActionPanel";
import { ContractDetailSkeleton } from "./sections/ContractDetailSkeleton";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { RISKS } from "./mock-data";
import type { Risk, ContractDetail, ApprovalStepView } from "./mock-data";
import { getContract } from "../../api/contracts";
import { toDetailView } from "./toDetailView";
import { getLifecycleSteps } from "./getLifecycleSteps";
import { useContractStatus } from "./hooks/useContractStatus";
import { cx } from "./cx";
import * as css from "./contractDetail.css";

/* ── 작은 표시 헬퍼(SRP: 뷰 조각) ── */

const RISK_LABEL: Record<Risk["level"], string> = {
  high: "고위험",
  mid: "주의",
  low: "참고",
};

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

function RiskCard({ risk }: { risk: Risk }) {
  return (
    <div className={cx(css.risk, css.riskLevel[risk.level])}>
      <div className={css.riskHead}>
        <span className={cx(css.rbadge, css.rbadgeLevel[risk.level])}>
          {RISK_LABEL[risk.level]}
        </span>
        <span className={css.riskClause}>{risk.clause}</span>
      </div>
      <div className={css.riskFinding}>{risk.finding}</div>
      <div className={css.rsuggest}>
        <Icon name="autoAwesome" size="sm" className={css.rsuggestIcon} />
        {risk.suggest}
      </div>
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

function ApprovalLineCard({ steps }: { steps: ApprovalStepView[] | null }) {
  return (
    <section className={css.card}>
      <header className={css.chead}>
        <Icon name="checkCircle" size="sm" className={css.cheadIconMuted} />
        결재선
        {steps && steps.length > 0 && (
          <span className={css.cheadNote}>기안 1순위 고정</span>
        )}
      </header>
      <div className={css.cbody}>
        {steps && steps.length > 0 ? (
          steps.map((step) => (
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
            </div>
          ))
        ) : (
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

function DocsCard({ d }: { d: ContractDetail }) {
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
  const { data, isLoading } = useQuery({
    queryKey: ["contract", id],
    queryFn: () => getContract(id),
    enabled: Boolean(id),
  });
  const { changeStatus, isUpdating } = useContractStatus(id);
  const [isAssignOpen, setIsAssignOpen] = useState(false);

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
  const riskHigh = RISKS.filter((r) => r.level === "high").length;
  // 라이프사이클 단계(라벨 mock 고정) — completed/active/scheduled 는 실 status 에서 파생.
  const lifecycleSteps = getLifecycleSteps(data.status);

  const handleAssign = (ownerId: string) => {
    changeStatus("assigning", ownerId);
    setIsAssignOpen(false);
  };

  return (
    <div className={css.page}>
      <button
        type="button"
        className={css.backlink}
        onClick={() => navigate("/contract/list")}
      >
        <Icon name="chevronLeft" size="sm" className={css.backIcon} />
        계약서 검토 조회
      </button>

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

      {/* lifecycle StepBar(mock) */}
      <section className={css.card}>
        <div className={css.cbody}>
          <div className={css.lifebar}>
            <StepBar steps={lifecycleSteps} />
          </div>
        </div>
      </section>

      <div className={css.railGrid}>
        {/* 좌측 본문 stack */}
        <div className={css.stack}>
          {/* AI 리스크(mock) */}
          <section className={css.card}>
            <header className={css.chead}>
              <Icon name="autoAwesome" size="sm" className={css.cheadIcon} />
              AI 계약 리스크
              <span className={css.riskCount}>
                <b className={css.riskCountHigh}>고위험 {riskHigh}</b> · 총 {RISKS.length}건 감지
              </span>
            </header>
            <div className={cx(css.cbody, css.stack)}>
              {RISKS.map((r, i) => (
                <RiskCard key={i} risk={r} />
              ))}
              <div className={css.docGroupLabel}>
                <Icon name="info" size="sm" className={css.noteIcon} />
                AI가 표준계약서·과거 검토 이력과 대조해 분석한 결과입니다. 최종 판단은 검토자에게 있습니다.
              </div>
            </div>
          </section>

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
          <ApprovalLineCard steps={d.approvalLine} />

          {/* 코멘트 · 이력 */}
          <CommentPanel contractId={id} />
        </div>

        {/* 우측 레일(sticky) */}
        <div className={cx(css.stack, css.sticky)}>
          <ReviewActionPanel
            status={data.status}
            can={can}
            ownerName={d.owner}
            approvalLine={d.approvalLine}
            isUpdating={isUpdating}
            onReject={() => changeStatus("requesterReview")}
            onReviewDone={() => changeStatus("reviewDone")}
            onAssign={() => setIsAssignOpen(true)}
          />
          <DocsCard d={d} />
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
