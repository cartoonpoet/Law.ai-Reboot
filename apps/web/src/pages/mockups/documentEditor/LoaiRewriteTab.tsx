import { LoaiRewriteTab as SharedLoaiRewriteTab } from "../../../components/documentEditor/LoaiRewriteTab";
import { MOCK_REWRITE_RESULT } from "./documentEditorMockData";

interface LoaiRewriteTabProps {
  /** 지금 본문에서 선택한 글. 없으면 빈 문자열. */
  selectedText: string;
}

/** 시안용 문장 다듬기 탭 — 실제 AI 대신 가짜 지연 뒤 미리 정해 둔 다듬기 결과를 돌려준다. */
export const LoaiRewriteTab = (props: LoaiRewriteTabProps) => (
  <SharedLoaiRewriteTab
    {...props}
    onRewrite={() => new Promise((resolve) => window.setTimeout(() => resolve(MOCK_REWRITE_RESULT), 700))}
    // 시안은 가짜 에디터라 실제 반영할 곳이 없다 — 버튼이 동작하는 모습만 보여준다.
    onApplyRewrite={() => {}}
  />
);
