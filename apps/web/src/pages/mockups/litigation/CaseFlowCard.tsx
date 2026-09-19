import { DdayBadge, Icon, Timeline } from "@lawkit/ui";
import type { TimelineItem } from "@lawkit/ui";
import * as base from "../../contract/contractDetail.css";

/* 사건 흐름 — 지난 일은 done, 지금 해야 할 일이 current. */
const FLOW_ITEMS: TimelineItem[] = [
  { id: "p1", date: "2026. 4. 2.", title: "소장 접수", description: "서울중앙지방법원 접수", status: "done" },
  { id: "p2", date: "2026. 5. 20.", title: "답변서 수령", description: "피고 대리인 법무법인 한결", status: "done" },
  { id: "p3", date: "2026. 7. 8.", title: "1차 변론기일", description: "쟁점 정리 · 추가 증거 제출 요구", status: "done" },
  {
    id: "p4",
    date: "2026. 9. 22.",
    title: "준비서면(2) 제출기한",
    description: "세림 초안 검토 후 제출",
    status: "current",
  },
  {
    id: "p5",
    date: "2026. 9. 24.",
    title: (
      <>
        2차 변론기일 <DdayBadge date="2026-09-24" />
      </>
    ),
    description: "증인신문 여부 정리",
    status: "upcoming",
  },
  { id: "p6", title: "선고기일", description: "미정", status: "upcoming" },
];

/** 사건 흐름 카드 — 접수부터 선고까지 한 줄로 본다. */
export const CaseFlowCard = () => (
  <section className={base.card}>
    <header className={base.chead}>
      <Icon name="timeline" size="sm" className={base.cheadIconMuted} />
      사건 흐름
      <span className={base.cheadNote}>지금 · 준비서면(2) 제출</span>
    </header>
    <div className={base.cbody}>
      <Timeline items={FLOW_ITEMS} />
    </div>
  </section>
);
