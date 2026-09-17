import type { ReactNode } from "react";
import { Icon } from "@lawkit/ui";
import type { AdviceResponse } from "@lawai/contracts";
import { Tag } from "../../../components/ui/Tag";
import { getCountryLabel } from "../adviceMeta";
import { sanitizeAdviceHtml } from "./sanitizeAdviceHtml";
import * as base from "../../contract/contractDetail.css";
import * as css from "./adviceDetail.css";

interface ContentBlockProps {
  title: string;
  children: ReactNode;
}

const ContentBlock = ({ title, children }: ContentBlockProps) => (
  <div className={base.rblock}>
    <div className={base.rbt}>{title}</div>
    <div className={base.rbtxt}>{children}</div>
  </div>
);

const RichText = ({ html }: { html: string }) => (
  <div className={css.richText} dangerouslySetInnerHTML={{ __html: sanitizeAdviceHtml(html) }} />
);

interface AdviceContentCardProps {
  advice: AdviceResponse;
}

/** 요청자가 작성한 자문 요청 원문 + 분류·국가·참조 같은 부가 정보. */
export const AdviceContentCard = ({ advice }: AdviceContentCardProps) => {
  const { details } = advice;
  const ccNames = [...details.ccUsers, ...details.ccDepts].map((ref) => ref.name);

  return (
    <section className={base.card}>
      <header className={base.chead}>
        <Icon name="list" size="sm" className={base.cheadIconMuted} />
        자문 요청 내용
        <span className={base.cheadNote}>{advice.createdAt.slice(0, 10)} 접수</span>
      </header>
      <div className={base.cbody}>
        <ContentBlock title="질의의 요지">
          <RichText html={advice.question} />
        </ContentBlock>
        <ContentBlock title="사안의 배경">
          <RichText html={advice.background} />
        </ContentBlock>
        {advice.etcRequest && <ContentBlock title="기타 요청사항">{advice.etcRequest}</ContentBlock>}
        <ContentBlock title="자문분류 · 국가">
          <div className={css.tagRow}>
            {advice.categories.map((name) => (
              <Tag key={name}>{name}</Tag>
            ))}
            {advice.countries.map((code) => (
              <Tag key={code}>{getCountryLabel(code)}</Tag>
            ))}
          </div>
        </ContentBlock>
        {(details.counterparty || details.project) && (
          <ContentBlock title="상대방 · 관련 프로젝트">
            {[details.counterparty, details.project?.name].filter(Boolean).join(" · ")}
          </ContentBlock>
        )}
        {ccNames.length > 0 && <ContentBlock title="참조수신자">{ccNames.join(", ")}</ContentBlock>}
        {details.ccSecret.length > 0 && (
          <ContentBlock title="참조수신자(비밀)">{details.ccSecret.map((ref) => ref.name).join(", ")}</ContentBlock>
        )}
      </div>
    </section>
  );
};
