import { useState } from "react";
import type { AiReviewFinding } from "@lawai/contracts";
import { LoaiPanel as SharedLoaiPanel, type LoaiModeTypes } from "../../../components/documentEditor/LoaiPanel";
import { buildMockDraft, MOCK_REVIEW_FINDINGS, MOCK_REWRITE_RESULT } from "./documentEditorMockData";

export type { LoaiModeTypes };

interface LoaiPanelProps {
  mode: LoaiModeTypes;
  onModeChange: (mode: LoaiModeTypes) => void;
  onClose: () => void;
  /** 지금 본문에서 고른 글 */
  selectedText: string;
  /** "새로 쓰기"에서 초안 만들기를 누르면 만들어진 본문 HTML */
  onDraftCreated: (html: string) => void;
  /** 지금 종이에 쓴 내용이 있는지 — 초안 만들기가 덮어쓰기 전에 한 번 더 묻는 기준 */
  hasDocumentContent: boolean;
}

/**
 * 시안용 로아이 패널 — 실제 API 대신 가짜 지연·가짜 데이터로 응답한다.
 * `initialLoaiMode="review"`로 곧장 열리는 시안 라우트를 위해 검토 결과 초기값을 한 번만 미리 채워 둔다
 * (SharedLoaiPanel은 탭을 "전환"할 때만 onReview를 부르므로, 처음부터 review로 열리는 경우는 직접 시드한다).
 */
export const LoaiPanel = (props: LoaiPanelProps) => {
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewFindings, setReviewFindings] = useState<AiReviewFinding[]>(() =>
    props.mode === "review" ? MOCK_REVIEW_FINDINGS : [],
  );

  const handleReview = () => {
    setIsReviewing(true);
    window.setTimeout(() => {
      setReviewFindings(MOCK_REVIEW_FINDINGS);
      setIsReviewing(false);
    }, 700);
  };

  return (
    <SharedLoaiPanel
      {...props}
      onGenerate={(request) => new Promise((resolve) => window.setTimeout(() => resolve(buildMockDraft(request)), 700))}
      onRewrite={() => new Promise((resolve) => window.setTimeout(() => resolve(MOCK_REWRITE_RESULT), 700))}
      // 시안은 가짜 에디터라 실제 반영할 곳이 없다 — 버튼이 동작하는 모습만 보여준다.
      onApplyRewrite={() => {}}
      onReview={handleReview}
      reviewFindings={reviewFindings}
      isReviewing={isReviewing}
    />
  );
};
