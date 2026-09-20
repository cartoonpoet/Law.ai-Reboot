import { LoaiDraftTab as SharedLoaiDraftTab } from "../../../components/documentEditor/LoaiDraftTab";
import { buildMockDraft, MOCK_DRAFT_PRESETS } from "./documentEditorMockData";

interface LoaiDraftTabProps {
  /** 초안 만들기를 누르면 생성된 본문 HTML을 캔버스에 반영한다. */
  onCreated: (html: string) => void;
  /** 지금 종이에 쓴 내용이 있는지 — 있으면 덮어쓰기 전에 한 번 더 묻는다. */
  hasExistingContent: boolean;
}

/** 시안용 초안 생성 탭 — 실제 AI 대신 가짜 지연 뒤 가짜 초안을 돌려준다. */
export const LoaiDraftTab = (props: LoaiDraftTabProps) => (
  <SharedLoaiDraftTab
    {...props}
    presets={MOCK_DRAFT_PRESETS}
    onGenerate={(request) => new Promise((resolve) => window.setTimeout(() => resolve(buildMockDraft(request)), 700))}
  />
);
