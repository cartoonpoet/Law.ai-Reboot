import { useState } from "react";
import { Button, ButtonGroup, Icon, Textarea, Timeline, type TimelineItem } from "@lawkit/ui";
import { Tag } from "../../../components/ui/Tag";
import { AiLine } from "./AiLine";
import { MockPageHead } from "./MockPageHead";
import { WaitingLabel } from "./WaitingLabel";
import {
  KIND_LABEL,
  PENDING_ITEMS,
  PROCESSED_COUNT,
  ROLE_LABEL,
  UPCOMING_COUNT,
  type MockInboxItem,
} from "./approvalInboxMockData";
import * as css from "./approvalInboxMock.css";

const SORTED_ITEMS = PENDING_ITEMS.toSorted((a, b) => b.waitingDays - a.waitingDays);

const STEP_STATUS: Record<MockInboxItem["steps"][number]["state"], TimelineItem["status"]> = {
  done: "done",
  now: "current",
  wait: "upcoming",
};

const toTimelineItems = (item: MockInboxItem): TimelineItem[] =>
  item.steps.map((step) => ({
    id: step.id,
    title: `${step.name} · ${step.role}`,
    description: [step.dept, step.decidedAt ?? (step.state === "now" ? "내 차례" : "대기"), step.comment]
      .filter(Boolean)
      .join(" · "),
    status: STEP_STATUS[step.state],
  }));

/** 시안 B — 목록 + 미리보기형: 왼쪽에서 고르면 오른쪽에서 내용·결재선을 보고 의견을 적어 바로 처리. */
export const ApprovalSplitMock = () => {
  const [selectedId, setSelectedId] = useState(SORTED_ITEMS[0].id);
  const [tab, setTab] = useState("pending");
  const selected = SORTED_ITEMS.find((item) => item.id === selectedId) ?? SORTED_ITEMS[0];

  return (
    <div className={css.page}>
      <MockPageHead
        variant="B. 목록 + 미리보기형"
        description="왼쪽 목록에서 결재를 고르면 오른쪽에 핵심 내용·AI 브리핑·결재선이 열립니다. 상세 화면으로 옮겨 다니지 않고 의견을 적어 바로 승인·반려해요."
      />

      <div className={css.split}>
        <div className={css.splitList}>
          <div className={css.splitListHead}>
            <ButtonGroup
              variant="segmented"
              value={tab}
              onChange={(value) => setTab(String(value))}
              items={[
                { value: "pending", label: `내 차례 ${PENDING_ITEMS.length}` },
                { value: "upcoming", label: `예정 ${UPCOMING_COUNT}` },
                { value: "processed", label: `처리 ${PROCESSED_COUNT}` },
              ]}
            />
          </div>
          {SORTED_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={item.id === selected.id ? `${css.splitItem} ${css.splitItemActive}` : css.splitItem}
              onClick={() => setSelectedId(item.id)}
            >
              <span className={css.splitItemTop}>
                <Tag>{KIND_LABEL[item.kind]}</Tag>
                <WaitingLabel days={item.waitingDays} />
              </span>
              <span className={css.splitItemTitle}>{item.title}</span>
              <span className={css.splitItemMeta}>
                {item.submitterName} {item.submitterDept} · {ROLE_LABEL[item.myRole]} {item.myStep}/{item.totalSteps}
              </span>
            </button>
          ))}
        </div>

        <section className={css.preview} aria-label="선택한 결재">
          <header className={css.previewHead}>
            <div>
              <Tag>{KIND_LABEL[selected.kind]}</Tag>
              <h2 className={css.previewTitle}>{selected.title}</h2>
              <div className={css.queueMeta}>
                <span className={css.mono}>{selected.code}</span>
                <span>·</span>
                <span>
                  {selected.submitterName} {selected.submitterDept} 상신 {selected.submittedAt}
                </span>
              </div>
            </div>
            <Button
              size="small"
              variant="outline"
              color="secondary"
              iconLeft={<Icon name="externalLink" size="sm" />}
            >
              문서 열기
            </Button>
          </header>

          <div className={css.previewBody}>
            <div className={css.previewMain}>
              <div>
                <div className={css.sectionLabel}>핵심 내용</div>
                <div className={css.factGrid}>
                  {selected.facts.map((fact) => (
                    <div key={fact.label} className={css.fact}>
                      <span className={css.factLabel}>{fact.label}</span>
                      <span className={css.factValue}>{fact.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              {selected.aiSummary && (
                <div>
                  <div className={css.sectionLabel}>AI 브리핑</div>
                  <AiLine item={selected} />
                </div>
              )}
            </div>
            <aside className={css.previewSide}>
              <div className={css.sectionLabel}>
                결재선 · {ROLE_LABEL[selected.myRole]} {selected.myStep}/{selected.totalSteps}
              </div>
              <Timeline items={toTimelineItems(selected)} />
            </aside>
          </div>

          <div className={css.decide}>
            <Textarea key={selected.id} textareaSize="small" rows={2} resize="none" placeholder="결재 의견 (선택)" />
            <div className={css.decideButtons}>
              <Button variant="outline" color="danger">
                반려
              </Button>
              <Button>{selected.myRole === "agree" ? "합의" : "승인"}</Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
