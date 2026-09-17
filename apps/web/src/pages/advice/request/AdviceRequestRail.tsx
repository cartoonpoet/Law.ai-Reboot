import { Card, Icon } from "@lawkit/ui";
import * as formCss from "../../contract/contractRequest.css";
import * as css from "./adviceRequest.css";

const FLOW = [
  { title: "접수", desc: "법무팀이 담당 변호사를 배정합니다. 담당자를 지정했다면 바로 검토가 시작돼요." },
  { title: "검토 · 추가 질의", desc: "확인이 필요한 내용은 담당자가 상세 화면에서 질문합니다." },
  { title: "회신", desc: "담당자가 회신하면 내용을 확인하고 종결하세요. 더 물을 것이 있으면 이어서 질문할 수 있어요." },
];

const flowHeader = (
  <span className={formCss.railHead}>
    <Icon name="info" size="sm" className={formCss.railHeadIcon} />
    요청 후 진행
  </span>
);

/** 자문 요청 우측 레일 — 요청 뒤에 무슨 일이 일어나는지 안내. */
export const AdviceRequestRail = () => (
  <div className={formCss.rail}>
    <Card bordered header={flowHeader}>
      <ol className={css.flowList}>
        {FLOW.map((step, index) => (
          <li key={step.title} className={css.flowItem}>
            <span className={css.flowNum}>{index + 1}</span>
            <div>
              <div className={css.flowTitle}>{step.title}</div>
              <div className={css.flowDesc}>{step.desc}</div>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  </div>
);
