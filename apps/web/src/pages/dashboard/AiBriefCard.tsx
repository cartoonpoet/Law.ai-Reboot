import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Icon } from "@lawkit/ui";
import type { AssistantAction, BriefToneTypes } from "@lawai/contracts";
import { useAssistantActions } from "../../components/assistant/useAssistantActions";
import { useDashboardBrief } from "./hooks/useDashboardBrief";
import { sparkle } from "../../components/ui/sparkle.css";
import * as css from "./dashboard.css";

const formatTime = (iso: string) => new Date(iso).toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" });

// 급한 정도 — 항목 앞 알약 문구
const TONE_LABEL: Record<BriefToneTypes, string> = {
  danger: "급해요",
  warning: "곧",
  info: "참고",
};

const getActionLabel = (action: AssistantAction) =>
  action.type === "open" ? action.label : action.type === "assign" ? `${action.ownerName}에게 배정` : "검토 시작";

/**
 * 대시보드 AI 브리핑 — 실제 AI 가 내 계약·결재로 오늘 챙길 일을 정리한다.
 * 항목마다 바로 할 수 있는 행동: 화면 열기는 바로, 배정·검토 시작은 한 번 더 확인한 뒤 실행.
 */
export const AiBriefCard = () => {
  const navigate = useNavigate();
  const { brief, isLoading, isRefreshing, isError, refresh } = useDashboardBrief();
  const { actionStates, runAction, dismissAction } = useAssistantActions();
  // 확인을 기다리는 항목(배정·검토 시작)
  const [confirmingKey, setConfirmingKey] = useState<string | null>(null);
  const [resultText, setResultText] = useState<string | null>(null);
  const hasBrief = brief !== null && !brief.needsSetup;

  const handleActionClick = (key: string, action: AssistantAction) => {
    if (action.type === "open") {
      runAction(key, action, { onDone: setResultText, onError: setResultText });
      return;
    }
    setConfirmingKey(key);
  };

  const handleConfirm = (key: string, action: AssistantAction) => {
    setConfirmingKey(null);
    runAction(key, action, { onDone: setResultText, onError: (text) => setResultText(`처리하지 못했어요. ${text}`) });
  };

  const handleCancel = (key: string) => {
    setConfirmingKey(null);
    dismissAction(key);
  };

  return (
    <section className={css.brief} aria-label="AI 브리핑">
      <div className={css.briefTop}>
        <span key={hasBrief ? brief.generatedAt : "empty"} className={hasBrief ? `${css.briefAvatar} ${sparkle}` : css.briefAvatar}>
          <Icon name="autoAwesome" size="sm" className={css.briefAvatarIcon} />
        </span>
        <span className={css.briefTitleGroup}>
          <span className={css.briefTitle}>AI 브리핑</span>
          <span className={css.briefMeta}>{hasBrief ? `${formatTime(brief.generatedAt)} 기준 · 내 계약·결재로 정리` : "내 계약·결재로 오늘 챙길 일을 정리해요"}</span>
        </span>
        {hasBrief && (
          <button type="button" className={css.briefRefresh} onClick={refresh} disabled={isRefreshing}>
            <Icon name="refreshCw" size="sm" className={css.briefRefreshIcon} />
            {isRefreshing ? "다시 정리하는 중…" : "다시 정리"}
          </button>
        )}
      </div>

      {isLoading && (
        <div className={css.briefSkeleton} aria-label="AI가 오늘 챙길 일을 정리하고 있어요…">
          <span className={css.briefSkeletonLine.wide} />
          <span className={css.briefSkeletonLine.full} />
          <span className={css.briefSkeletonLine.half} />
        </div>
      )}

      {isError && (
        <div className={css.briefMuted}>
          AI 브리핑을 불러오지 못했어요.{" "}
          <button type="button" className={css.briefLink} onClick={refresh}>
            다시 시도
          </button>
        </div>
      )}

      {brief && (
        <>
          <div className={css.briefHeadline}>{brief.headline}</div>
          {brief.needsSetup && (
            <div>
              <Button size="small" onClick={() => navigate("/system")}>
                AI 설정하러 가기
              </Button>
            </div>
          )}
          {brief.points.length > 0 && (
            <div className={css.briefList}>
              {brief.points.map((point, index) => {
                const key = `brief-${index}`;
                const state = actionStates[key];
                const action = point.action;
                return (
                  <div key={key} className={css.briefRow}>
                    <span className={css.briefTone[point.tone]}>{TONE_LABEL[point.tone]}</span>
                    <span className={css.briefText}>{point.text}</span>
                    {action && state === "done" && <span className={css.briefDone}>완료했어요</span>}
                    {action && state !== "done" && state !== "dismissed" && confirmingKey !== key && (
                      <Button
                        size="small"
                        variant="outline"
                        color="secondary"
                        disabled={state === "running"}
                        onClick={() => handleActionClick(key, action)}
                      >
                        {state === "running" ? "처리 중…" : getActionLabel(action)}
                      </Button>
                    )}
                    {action && confirmingKey === key && (
                      <span className={css.briefConfirm}>
                        정말 할까요?
                        <Button size="small" onClick={() => handleConfirm(key, action)}>
                          확인
                        </Button>
                        <Button size="small" variant="outline" color="secondary" onClick={() => handleCancel(key)}>
                          취소
                        </Button>
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {resultText && <div className={css.briefMuted}>{resultText}</div>}
        </>
      )}
    </section>
  );
};
