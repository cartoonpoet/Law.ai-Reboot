import { Button, ButtonGroup, Icon } from "@lawkit/ui";
import { sparkle } from "../../../components/ui/sparkle.css";
import { LoaiDraftTab } from "./LoaiDraftTab";
import { LoaiRewriteTab } from "./LoaiRewriteTab";
import { LoaiReviewTab } from "./LoaiReviewTab";
import * as css from "./documentEditorMock.css";

export type LoaiModeTypes = "draft" | "rewrite" | "review";

/** 세 가지 일을 이름과 아이콘 모두로 구분한다 — 새 문서(＋) · 고른 문장(연필) · 문서 전체(돋보기). */
const TABS = [
  { value: "draft", label: "새로 쓰기", icon: <Icon name="filePlus" size="sm" /> },
  { value: "rewrite", label: "문장 고치기", icon: <Icon name="edit" size="sm" /> },
  { value: "review", label: "전체 검토", icon: <Icon name="search" size="sm" /> },
];

/** 지금 무엇을 하는 칸인지 한 줄로 알려 준다. */
const MODE_HINT: Record<LoaiModeTypes, string> = {
  draft: "제목·전문·조항까지 갖춘 계약서 한 벌을 통째로 만들어 종이에 채워 넣습니다.",
  rewrite: "종이에서 고른 문장 하나만 다시 씁니다. 다른 곳은 그대로 둡니다.",
  review: "지금 종이에 적힌 문서 전체를 읽고, 회사에 불리한 조항·빈칸·빠진 조항을 찾습니다.",
};

interface LoaiPanelProps {
  mode: LoaiModeTypes;
  onModeChange: (mode: LoaiModeTypes) => void;
  onClose: () => void;
  /** 지금 본문에서 고른 글 */
  selectedText: string;
}

/** 편집기 오른쪽에 붙는 로아이 패널 — 초안 생성·문장 다듬기·초안 검토 세 가지를 한곳에서. */
export const LoaiPanel = ({ mode, onModeChange, onClose, selectedText }: LoaiPanelProps) => (
  <aside className={css.panel}>
    <header className={css.panelHead}>
      <span className={sparkle}>
        <Icon name="autoAwesome" size="sm" className={css.panelHeadIcon} />
      </span>
      로아이 문서 도우미
      <span className={css.panelHeadSpacer} />
      <Button
        size="small"
        variant="outline"
        color="secondary"
        iconLeft={<Icon name="close" size="sm" />}
        aria-label="로아이 패널 닫기"
        onClick={onClose}
      />
    </header>

    <div className={css.panelTabs}>
      <ButtonGroup
        variant="segmented"
        size="small"
        items={TABS}
        value={mode}
        onChange={(next) => onModeChange(next as LoaiModeTypes)}
        className={css.panelTabGroup}
      />
      <span className={css.panelTabHint}>{MODE_HINT[mode]}</span>
    </div>

    <div className={css.panelBody}>
      {mode === "draft" && <LoaiDraftTab />}
      {mode === "rewrite" && <LoaiRewriteTab selectedText={selectedText} />}
      {mode === "review" && <LoaiReviewTab />}
    </div>
  </aside>
);
