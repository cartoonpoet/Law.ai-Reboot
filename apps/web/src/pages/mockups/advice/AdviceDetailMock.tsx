import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Icon } from "@lawkit/ui";
import { Badge } from "../../../components/ui/Badge";
import { Tag } from "../../../components/ui/Tag";
import { cx } from "../../contract/cx";
import * as css from "../../contract/contractDetail.css";

// 시안 표시용 자문 한 건.
const ADVICE = {
  code: "ADV-2026-0091",
  title: "해외 대리점 계약 준거법 문의",
  category: "계약해석",
  region: "해외",
  secure: true,
  requesterName: "김수현",
  requesterDept: "영업1팀",
  ownerName: "박변호사",
  requestedAt: "2026-09-14",
  dueDate: "2026-09-18",
  dueLabel: "D-2",
  background:
    "베트남 현지 법인과 대리점 계약을 협의 중입니다. 상대방이 준거법을 베트남법으로 하자고 요구하고 있고, 분쟁해결도 현지 법원으로 하자는 입장입니다.",
  question:
    "준거법을 한국법으로 둘 수 있는지, 둘 수 없다면 중재로 가는 편이 나은지 알고 싶습니다. 대리점 해지 제한 규정이 있다면 그 영향도 함께 봐 주세요.",
  etcRequest: "9월 18일 임원 보고 전에 회신 부탁드립니다.",
};

const THREAD = [
  { at: "2026-09-14", who: "김수현", role: "요청자", text: "준거법을 한국법으로 둘 수 있을까요? 상대는 베트남 법인입니다." },
  { at: "2026-09-15", who: "박변호사", role: "담당", text: "상대국 강행규정을 확인 중입니다. 대리점 해지 제한이 쟁점이에요." },
  { at: "2026-09-16", who: "김수현", role: "요청자", text: "중재로 가면 비용이 얼마나 더 드는지도 알려주시면 좋겠습니다." },
];

function Fact({ label, span, children }: { label: string; span?: boolean; children: ReactNode }) {
  return (
    <div className={span ? cx(css.fact, css.span2) : css.fact}>
      <div className={css.fl}>{label}</div>
      <div className={css.fv}>{children}</div>
    </div>
  );
}

function Rblock({ title, text }: { title: string; text: string }) {
  return (
    <div className={css.rblock}>
      <div className={css.rbt}>{title}</div>
      <div className={css.rbtxt}>{text}</div>
    </div>
  );
}

/** 법률자문 상세 시안 — 계약 상세 화면과 같은 부품·배치(요약줄 + 본문 + 우측 레일). */
export function AdviceDetailMock() {
  const navigate = useNavigate();

  return (
    <div className={css.page}>
      <button type="button" className={css.backlink} onClick={() => navigate("/mockups/advice-list")}>
        <Icon name="chevronLeft" size="sm" style={{ width: 14, height: 14 }} />
        법률자문 목록
      </button>

      <header className={css.hero}>
        <div>
          <div className={css.heroTitleRow}>
            {ADVICE.secure && <Icon name="lock" size="sm" style={{ width: 15, height: 15, color: "currentColor" }} />}
            <h1 className={css.heroTitle}>{ADVICE.title}</h1>
            <Badge color="primary" size="md" dot>검토 중</Badge>
          </div>
          <div className={css.hmeta}>
            <span className={css.hcode}>{ADVICE.code}</span>
            <span className={css.sep}>·</span>
            <span>{ADVICE.requesterDept} {ADVICE.requesterName}</span>
            <span className={css.sep}>·</span>
            <span>{ADVICE.requestedAt} 요청</span>
            <span className={css.sep}>·</span>
            <Tag>{ADVICE.category}</Tag>
          </div>
        </div>
        <div className={css.heroActions}>
          <Button variant="outline" color="secondary" size="medium">계약으로 만들기</Button>
          <Button size="medium">회신 작성</Button>
        </div>
      </header>

      <div className={css.glance}>
        <div className={css.gcell}>
          <div className={css.gl}>상태</div>
          <div className={css.gv}>검토 중</div>
        </div>
        <div className={css.gcell}>
          <div className={css.gl}>자문분류</div>
          <div className={css.gv}>{ADVICE.category}</div>
        </div>
        <div className={css.gcell}>
          <div className={css.gl}>지역</div>
          <div className={css.gv}>{ADVICE.region}</div>
        </div>
        <div className={css.gcell}>
          <div className={css.gl}>담당</div>
          <div className={css.gv}>{ADVICE.ownerName}</div>
        </div>
        <div className={css.gcell}>
          <div className={css.gl}>회신 기한</div>
          <div className={cx(css.gv, css.gvWarn)}>{ADVICE.dueLabel} · {ADVICE.dueDate}</div>
        </div>
        <div className={css.gcell}>
          <div className={css.gl}>보안</div>
          <div className={css.gv}>{ADVICE.secure ? "보안" : "일반"}</div>
        </div>
      </div>

      <div className={css.railGrid}>
        <div className={css.stack}>
          <section className={css.card}>
            <header className={css.chead}>
              <Icon name="autoAwesome" size="sm" className={css.cheadIcon} />
              AI 자문 도우미
            </header>
            <div className={css.cbody}>
              <div className={css.facts}>
                <Fact label="핵심 쟁점" span>준거법 지정 가능 여부 · 분쟁해결지 선택 · 대리점보호법 적용 범위</Fact>
                <Fact label="비슷한 지난 자문">2건 (2025-11 · 2026-03)</Fact>
                <Fact label="참고 자료">표준 대리점계약 제18조</Fact>
              </div>
            </div>
          </section>

          <section className={css.card}>
            <header className={css.chead}>
              <Icon name="list" size="sm" className={css.cheadIconMuted} />
              자문 내용
            </header>
            <div className={css.cbody}>
              <Rblock title="사안의 배경" text={ADVICE.background} />
              <Rblock title="질의의 요지" text={ADVICE.question} />
              <Rblock title="기타 요청사항" text={ADVICE.etcRequest} />
            </div>
          </section>

          <section className={css.card}>
            <header className={css.chead}>
              <Icon name="messageCircle" size="sm" className={css.cheadIconMuted} />
              질의 · 회신
            </header>
            <div className={css.cbody}>
              <div className={css.facts}>
                {THREAD.map((message) => (
                  <Fact key={message.at + message.who} label={`${message.at} · ${message.who}(${message.role})`} span>
                    {message.text}
                  </Fact>
                ))}
              </div>
            </div>
          </section>
        </div>

        <div className={cx(css.stack, css.sticky)}>
          <section className={css.card}>
            <header className={css.chead}>
              <Icon name="factCheck" size="sm" className={css.cheadIconMuted} />
              결재선
            </header>
            <div className={css.cbody}>
              <div className={css.facts}>
                <Fact label="기안" span>손준호 · 개발팀</Fact>
                <Fact label="승인" span>김법무 · 법무팀</Fact>
              </div>
            </div>
          </section>

          <section className={css.card}>
            <header className={css.chead}>
              <Icon name="folder" size="sm" className={css.cheadIconMuted} />
              관련 문서 · 계약
            </header>
            <div className={css.cbody}>
              <div className={css.facts}>
                <Fact label="관련 계약" span>대리점계약(초안) v2</Fact>
                <Fact label="첨부" span>협의 메일.pdf · 상대방 수정안.docx</Fact>
              </div>
            </div>
          </section>

          <section className={css.card}>
            <header className={css.chead}>
              <Icon name="clock" size="sm" className={css.cheadIconMuted} />
              이력
            </header>
            <div className={css.cbody}>
              <div className={css.facts}>
                <Fact label="2026-09-15" span>박변호사 배정</Fact>
                <Fact label="2026-09-14" span>자문 요청 접수</Fact>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
