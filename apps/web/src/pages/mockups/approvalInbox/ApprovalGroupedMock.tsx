import { useState } from "react";
import { Avatar, Button, ButtonGroup } from "@lawkit/ui";
import { Panel } from "../../../components/ui/Panel";
import { Tag } from "../../../components/ui/Tag";
import { AiLine } from "./AiLine";
import { MockPageHead } from "./MockPageHead";
import { WaitingLabel } from "./WaitingLabel";
import {
  KIND_LABEL,
  KIND_ORDER,
  PENDING_ITEMS,
  PROCESSED_COUNT,
  ROLE_LABEL,
  UPCOMING_COUNT,
  type MockInboxItem,
} from "./approvalInboxMockData";
import * as css from "./approvalInboxMock.css";

// 유형마다 결재자가 보는 핵심 칸이 달라 두 번째 칸 이름을 바꾼다.
const KEY_FACT_LABEL: Record<MockInboxItem["kind"], string> = {
  contractSign: "금액",
  adviceRequest: "질의 요지",
  adviceAnswer: "회신 요지",
};

const getKeyFact = (item: MockInboxItem): string =>
  item.facts.find((fact) => fact.label === KEY_FACT_LABEL[item.kind])?.value ?? "-";

const GroupTable = ({ kind, items }: { kind: MockInboxItem["kind"]; items: MockInboxItem[] }) => (
  <section className={css.groupSection}>
    <div className={css.groupHead}>
      <h2 className={css.groupTitle}>{KIND_LABEL[kind]}</h2>
      <span className={css.groupCount}>{items.length}건</span>
    </div>
    <Panel flush>
      <table className={css.table}>
        <thead>
          <tr>
            <th className={`${css.th} ${css.col.doc}`}>문서</th>
            <th className={`${css.th} ${css.col.key}`}>{KEY_FACT_LABEL[kind]}</th>
            <th className={`${css.th} ${css.col.submitter}`}>상신자</th>
            <th className={`${css.th} ${css.col.step}`}>내 단계</th>
            <th className={`${css.th} ${css.col.wait}`}>대기</th>
            <th className={`${css.th} ${css.col.action}`} />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td className={css.td}>
                <div className={css.rowTitle}>{item.title}</div>
                <div className={`${css.rowSub} ${css.mono}`}>{item.code}</div>
                <AiLine item={item} />
              </td>
              <td className={css.td}>{getKeyFact(item)}</td>
              <td className={css.td}>
                <div className={css.queueTitleRow}>
                  <Avatar size="sm" color="primary" initials={item.submitterName[0]} />
                  <div>
                    <div>{item.submitterName}</div>
                    <div className={css.rowSub}>{item.submitterDept}</div>
                  </div>
                </div>
              </td>
              <td className={css.td}>
                <Tag>
                  {ROLE_LABEL[item.myRole]} {item.myStep}/{item.totalSteps}
                </Tag>
              </td>
              <td className={css.td}>
                <WaitingLabel days={item.waitingDays} />
              </td>
              <td className={`${css.td} ${css.textRight}`}>
                <Button size="small">처리</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  </section>
);

/** 시안 C — 유형별 묶음형: 체결 품의·자문 요청·자문 회신을 따로 묶어 유형마다 필요한 칸을 보여준다. */
export const ApprovalGroupedMock = () => {
  const [tab, setTab] = useState("pending");
  const groups = KIND_ORDER.map((kind) => ({
    kind,
    items: PENDING_ITEMS.filter((item) => item.kind === kind).toSorted((a, b) => b.waitingDays - a.waitingDays),
  })).filter((group) => group.items.length > 0);

  return (
    <div className={css.page}>
      <MockPageHead
        variant="C. 유형별 묶음형"
        description="체결 품의·자문 요청·자문 회신을 따로 묶어, 유형마다 결재자가 먼저 봐야 할 칸(금액·질의 요지·회신 요지)을 보여줍니다. 처리는 문서 상세에서 해요."
      >
        <ButtonGroup
          variant="segmented"
          value={tab}
          onChange={(value) => setTab(String(value))}
          items={[
            { value: "pending", label: `내 차례 ${PENDING_ITEMS.length}` },
            { value: "upcoming", label: `예정 ${UPCOMING_COUNT}` },
            { value: "processed", label: `처리한 결재 ${PROCESSED_COUNT}` },
          ]}
        />
      </MockPageHead>

      {groups.map((group) => (
        <GroupTable key={group.kind} kind={group.kind} items={group.items} />
      ))}
    </div>
  );
};
