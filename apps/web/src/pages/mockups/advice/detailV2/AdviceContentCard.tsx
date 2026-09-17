import { Icon } from "@lawkit/ui";
import * as base from "../../../contract/contractDetail.css";
import { ADVICE } from "./adviceDetailV2Data";

interface ContentBlockProps {
  title: string;
  text: string;
}

const ContentBlock = ({ title, text }: ContentBlockProps) => (
  <div className={base.rblock}>
    <div className={base.rbt}>{title}</div>
    <div className={base.rbtxt}>{text}</div>
  </div>
);

/** 요청자가 작성한 자문 요청 원문. */
export const AdviceContentCard = () => (
  <section className={base.card}>
    <header className={base.chead}>
      <Icon name="list" size="sm" className={base.cheadIconMuted} />
      자문 요청 내용
      <span className={base.cheadNote}>{ADVICE.requestedAt} 접수</span>
    </header>
    <div className={base.cbody}>
      <ContentBlock title="질의의 요지" text={ADVICE.question} />
      <ContentBlock title="사안의 배경" text={ADVICE.background} />
      <ContentBlock title="기타 요청사항" text={ADVICE.etcRequest} />
    </div>
  </section>
);
