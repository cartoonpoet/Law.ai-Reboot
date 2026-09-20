import { useState } from "react";
import { LoaiReviewTab as SharedLoaiReviewTab } from "../../../components/documentEditor/LoaiReviewTab";
import { MOCK_REVIEW_FINDINGS } from "./documentEditorMockData";

/** 시안용 초안 검토 탭 — 실제 AI 대신 가짜 지연 뒤 미리 정해 둔 검토 결과를 돌려준다. */
export const LoaiReviewTab = () => {
  const [isReviewing, setIsReviewing] = useState(false);
  const [findings, setFindings] = useState(MOCK_REVIEW_FINDINGS);

  const handleReview = () => {
    setIsReviewing(true);
    window.setTimeout(() => {
      setFindings(MOCK_REVIEW_FINDINGS);
      setIsReviewing(false);
    }, 700);
  };

  return <SharedLoaiReviewTab onReview={handleReview} findings={findings} isReviewing={isReviewing} />;
};
