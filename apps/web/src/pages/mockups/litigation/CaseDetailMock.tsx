import { Button, Callout, DdayBadge, Icon } from "@lawkit/ui";
import { Badge } from "../../../components/ui/Badge";
import { LifecycleRing } from "../../contract/sections/LifecycleRing";
import { LitigationAiCard } from "./LitigationAiCard";
import { CaseFlowCard } from "./CaseFlowCard";
import { CaseHearingsCard } from "./CaseHearingsCard";
import { CASE, CASE_DOCUMENTS, CASE_PROGRESS, COUNSEL_ROWS } from "./caseDetailMockData";
import { SIDE_LABEL, STAGE_LABEL, formatDate, formatMoney } from "./litigationMockData";
import * as base from "../../contract/contractDetail.css";
import * as css from "./litigationMock.css";

// 요약 줄 6칸 — 자문·계약 상세의 at-a-glance 와 같은 자리.
const GLANCE_FIELDS = [
  { label: "법원 · 재판부", value: CASE.courtName },
  { label: "우리 지위", value: `${SIDE_LABEL[CASE.side]} · 상대 ${CASE.opponent}` },
  { label: "심급", value: STAGE_LABEL[CASE.stage] },
  { label: "소가", value: formatMoney(CASE.amount) },
  { label: "사내 담당", value: `${CASE.ownerName} · ${CASE.ownerDept}` },
  { label: "선임 법무법인", value: CASE.firmName ?? "외부 선임 없음" },
];

const NEXT = CASE.nextHearing;

/** 사건 상세 — 계약·자문 상세와 같은 뼈대(백링크 → 히어로 → 요약줄 → 진행 게이지 → 본문/레일). */
export const CaseDetailMock = () => (
  <>
    <div className={css.mockNote}>
      <Callout intent="info" title="사건 상세">
        계약·자문 상세와 같은 뼈대입니다. 위에 요약 줄과 진행 게이지, 왼쪽에 로아이 정리·사건 흐름·기일·서면, 오른쪽에
        처리 현황과 외부 선임을 둡니다.
      </Callout>
    </div>

    <button type="button" className={base.backlink}>
      <Icon name="chevronLeft" size="sm" className={base.backIcon} />
      송무 사건 조회
    </button>

    <header className={base.hero}>
      <div>
        <div className={base.heroTitleRow}>
          <h1 className={base.heroTitle}>{CASE.name}</h1>
          <Badge color="primary" size="md" dot>
            {CASE.status}
          </Badge>
        </div>
        <div className={base.hmeta}>
          <span className={base.hcode}>{CASE.caseNo}</span>
          <span className={base.sep}>|</span>
          <span>{formatDate(CASE.filedAt)} 소 제기</span>
          <span className={base.sep}>|</span>
          <span>최근 수정 {formatDate(CASE.updatedAt)}</span>
        </div>
      </div>
      <div className={base.heroActions}>
        <Button variant="outline" color="secondary">
          기일 추가
        </Button>
        <Button>서면 등록</Button>
      </div>
    </header>

    <div className={base.glance}>
      {GLANCE_FIELDS.map((field) => (
        <div key={field.label} className={base.gcell}>
          <div className={base.gl}>{field.label}</div>
          <div className={base.gv}>{field.value}</div>
        </div>
      ))}
    </div>

    <LifecycleRing progress={CASE_PROGRESS} />

    <div className={base.railGrid}>
      <div className={base.stack}>
        <LitigationAiCard />
        <CaseFlowCard />
        <CaseHearingsCard />

        <section className={base.card}>
          <header className={base.chead}>
            <Icon name="paperclip" size="sm" className={base.cheadIconMuted} />
            서면 · 증거
            <span className={base.cheadNote}>{CASE_DOCUMENTS.length}개</span>
          </header>
          <div className={base.cbody}>
            {CASE_DOCUMENTS.map((doc) => (
              <div key={doc.id} className={css.docRow}>
                <Icon name="fileText" size="sm" className={css.docIcon} />
                <span className={css.docName}>{doc.name}</span>
                <span className={css.meta}>{doc.kind}</span>
                <span className={css.docMeta}>{formatDate(doc.at)}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className={`${base.stack} ${base.sticky}`}>
        <section className={base.card}>
          <header className={base.chead}>
            <Icon name="factCheck" size="sm" className={base.cheadIconMuted} />
            처리 현황
          </header>
          <div className={base.cbody}>
            <div className={base.akv}>
              <span className={base.akvKey}>다음 기일</span>
              <span className={base.akvValue}>
                {NEXT ? `${formatDate(NEXT.date)} ${NEXT.time}` : "예정 없음"}
              </span>
            </div>
            <div className={base.akv}>
              <span className={base.akvKey}>남은 날</span>
              <span className={base.akvValue}>{NEXT ? <DdayBadge date={NEXT.date} /> : "-"}</span>
            </div>
            <div className={base.akv}>
              <span className={base.akvKey}>낼 서면</span>
              <span className={base.akvValue}>{CASE.todo ?? "없음"}</span>
            </div>
            <div className={base.akv}>
              <span className={base.akvKey}>사건 상태</span>
              <span className={base.akvValue}>{CASE.status}</span>
            </div>
            <div className={css.railActions}>
              <Button size="small">준비서면 올리기</Button>
              <Button size="small" variant="outline" color="secondary">
                담당 바꾸기
              </Button>
            </div>
          </div>
        </section>

        <section className={base.card}>
          <header className={base.chead}>
            <Icon name="users" size="sm" className={base.cheadIconMuted} />
            담당 · 외부 선임
          </header>
          <div className={`${base.cbody} ${css.railFacts}`}>
            {COUNSEL_ROWS.map((row) => (
              <div key={row.label} className={base.fact}>
                <div className={base.fl}>{row.label}</div>
                <div className={base.fv}>{row.value}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  </>
);
