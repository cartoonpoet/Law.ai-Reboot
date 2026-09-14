import { useState } from "react";
import type { KeyboardEvent } from "react";
import { Button, Chip, DdayBadge, Icon, Input, ListGroup, ListGroupItem, Widget } from "@lawkit/ui";
import { Badge as StatusToneBadge } from "../../../components/ui/Badge";
import { AiNote } from "./AiNote";
import { DashboardHeader } from "./DashboardHeader";
import { ScheduleWidget } from "./DashboardSideWidgets";
import { COPILOT_ANSWERS, COPILOT_FALLBACK, RISKS, RISK_LEVEL_LABEL, TASKS } from "./mockDashboardData";
import type { CopilotAnswer } from "./mockDashboardData";
import * as css from "./dashboardMock.css";

const TOP_RISKS = RISKS.filter((r) => r.level === "high");

/**
 * B. AI 코파일럿 — 대시보드 맨 위가 "무엇을 도와드릴까요?" 입력. 추천 질문을 누르거나 직접 물으면
 * AI 답과 관련 항목(바로가기)이 그 자리에 뜬다. 아래엔 AI 가 미리 준비해 둔 일.
 */
export const CopilotVariant = () => {
  const [asked, setAsked] = useState<CopilotAnswer>(COPILOT_ANSWERS[0]);
  const relatedTasks = TASKS.filter((t) => asked.taskIds.includes(t.id));

  // React 19 폼 액션 — 입력 하나짜리 제출 폼.
  const handleAsk = (formData: FormData) => {
    const question = String(formData.get("question") ?? "").trim();
    if (!question) return;
    const matched = COPILOT_ANSWERS.find((a) => a.question === question);
    setAsked(matched ?? { question, answer: COPILOT_FALLBACK, taskIds: [] });
  };

  const handleChipKeyDown = (answer: CopilotAnswer) => (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setAsked(answer);
    }
  };

  return (
    <div className={css.page}>
      <DashboardHeader />

      <section className={css.aiPanel} aria-label="AI 코파일럿">
        <div className={css.aiPanelHead}>
          <Icon name="autoAwesome" size="sm" className={css.aiPanelIcon} />
          무엇을 도와드릴까요?
        </div>
        <form action={handleAsk} className={css.promptForm}>
          <Input
            name="question"
            placeholder="예) 이번 주 만료되는 계약 알려줘"
            inputSize="medium"
            wrapperClassName={css.promptInput}
            aria-label="AI 에게 질문"
          />
          <Button type="submit">물어보기</Button>
        </form>
        <div className={css.chipRow}>
          {COPILOT_ANSWERS.map((a) => (
            <Chip
              key={a.question}
              selected={asked.question === a.question}
              role="button"
              tabIndex={0}
              className={css.chip}
              onClick={() => setAsked(a)}
              onKeyDown={handleChipKeyDown(a)}
            >
              {a.question}
            </Chip>
          ))}
        </div>
        <div className={css.answer} aria-live="polite">
          <span className={css.taskSub}>“{asked.question}”</span>
          <p className={css.answerText}>{asked.answer}</p>
          {relatedTasks.length > 0 && (
            <ListGroup variant="flush">
              {relatedTasks.map((t) => (
                <ListGroupItem
                  key={t.id}
                  trailing={
                    <span className={css.trailing}>
                      <DdayBadge date={t.due} />
                      <Button size="small">{t.action}</Button>
                    </span>
                  }
                >
                  <span className={css.taskMain}>
                    <span className={css.taskTitle}>{t.title}</span>
                    <AiNote>{t.aiPrepared}</AiNote>
                  </span>
                </ListGroupItem>
              ))}
            </ListGroup>
          )}
        </div>
      </section>

      <div className={css.mainGrid}>
        <Widget title="AI 가 준비해 둔 일" badge={TASKS.length} flush>
          <ListGroup variant="flush">
            {TASKS.map((t) => (
              <ListGroupItem
                key={t.id}
                trailing={
                  <span className={css.trailing}>
                    <DdayBadge date={t.due} />
                    <Button size="small" variant="outline">
                      확인
                    </Button>
                  </span>
                }
              >
                <span className={css.taskMain}>
                  <span className={css.taskTitle}>{t.title}</span>
                  <AiNote>{t.aiPrepared}</AiNote>
                </span>
              </ListGroupItem>
            ))}
          </ListGroup>
        </Widget>

        <aside className={css.rail}>
          <Widget title="AI 가 찾은 높은 리스크" badge={TOP_RISKS.length} flush>
            <ListGroup variant="flush">
              {TOP_RISKS.map((r) => (
                <ListGroupItem key={r.id} leading={<StatusToneBadge color="danger" size="sm">{RISK_LEVEL_LABEL[r.level]}</StatusToneBadge>}>
                  <span className={css.taskMain}>
                    <span className={css.railTitle}>{r.contract}</span>
                    <span className={css.taskSub}>{r.clause}</span>
                  </span>
                </ListGroupItem>
              ))}
            </ListGroup>
          </Widget>
          <ScheduleWidget />
        </aside>
      </div>
    </div>
  );
};
