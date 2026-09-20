import { useState } from "react";
import { Button, Callout, Icon } from "@lawkit/ui";
import { Eyebrow } from "../../../components/ui/Eyebrow";
import { RichTextEditor } from "../../../components/ui/RichTextEditor";
import { LoaiPanel, type LoaiModeTypes } from "./LoaiPanel";
import { SelectionBubble } from "./SelectionBubble";
import { VersionHistoryModal } from "./VersionHistoryModal";
import { MOCK_NDA_HTML, MOCK_VERSIONS } from "./documentEditorMockData";
import * as css from "./documentEditorMock.css";

interface DocumentEditorMockProps {
  /** 시안 안내 상자 제목·설명 */
  variant: string;
  description: string;
  /** 처음부터 열어 둘 로아이 패널 모드. 없으면 닫힌 상태. */
  initialLoaiMode?: LoaiModeTypes;
  /** 처음부터 버전 이력 모달을 열어 둘지 */
  isVersionOpenAtFirst?: boolean;
  /** 로아이 "문장 다듬기"에 미리 넣어 둘 고른 문장 */
  initialSelectedText?: string;
}

const LATEST = MOCK_VERSIONS[0];

/**
 * 2·3·4. 문서 편집기 — 종이처럼 보이는 캔버스 + 기존 서식 툴바(표·로아이 추가) + 로아이 패널 + 버전 이력.
 * 실제 편집은 기존 RichTextEditor(Tiptap)를 그대로 쓰고, 이 화면은 그 위에 문서 작업에 필요한 것만 얹는다.
 */
export const DocumentEditorMock = ({
  variant,
  description,
  initialLoaiMode,
  isVersionOpenAtFirst = false,
  initialSelectedText = "",
}: DocumentEditorMockProps) => {
  const [content, setContent] = useState(MOCK_NDA_HTML);
  const [loaiMode, setLoaiMode] = useState<LoaiModeTypes | null>(initialLoaiMode ?? null);
  const [isVersionOpen, setIsVersionOpen] = useState(isVersionOpenAtFirst);
  const [selectedText, setSelectedText] = useState(initialSelectedText);

  const handleToggleLoai = () => setLoaiMode(loaiMode === null ? "draft" : null);

  const handleRewrite = (text: string) => {
    setSelectedText(text);
    setLoaiMode("rewrite");
  };

  return (
    <div>
      <div className={css.mockNote}>
        <Callout intent="info" title={variant}>
          {description}
        </Callout>
      </div>

      <div className={css.editorHead}>
        <div className={css.editorTitleGroup}>
          <Eyebrow>계약 관리 · 표준양식 관리</Eyebrow>
          <div className={css.editorTitleRow}>
            <h1 className={css.editorTitle}>비밀유지계약서(NDA) 표준</h1>
            <span className={css.verChip}>v{LATEST.versionNo}</span>
          </div>
          <span className={css.editorSub}>
            비밀유지(NDA) · 마지막 저장 {LATEST.savedAt} · {LATEST.savedBy}
          </span>
        </div>

        <div className={css.editorActions}>
          <Button
            variant="outline"
            color="secondary"
            iconLeft={<Icon name="history" size="sm" />}
            onClick={() => setIsVersionOpen(true)}
          >
            버전 이력
          </Button>
          <Button iconLeft={<Icon name="save" size="sm" />}>저장하기</Button>
        </div>
      </div>

      <div className={loaiMode === null ? css.editorLayout.solo : css.editorLayout.withPanel}>
        <RichTextEditor
          ariaLabel="표준양식 문서 편집기"
          value={content}
          onChange={setContent}
          withTable
          withFullToolbar
          onLoaiClick={handleToggleLoai}
          isLoaiOpen={loaiMode !== null}
          wrapClassName={css.docShell}
          areaClassName={css.docPage}
          footerExtra={
            <span className={css.docFoot}>
              <span className={css.docFootText}>다음 저장은 v{LATEST.versionNo + 1} 로 쌓입니다</span>
              <span className={css.docFootSaved}>고친 내용 있음</span>
            </span>
          }
          renderOverlay={(editor) => {
            const { from, to, empty } = editor.state.selection;
            if (empty) return null;
            return <SelectionBubble onRewrite={() => handleRewrite(editor.state.doc.textBetween(from, to, " "))} />;
          }}
        />

        {loaiMode !== null && (
          <LoaiPanel
            mode={loaiMode}
            onModeChange={setLoaiMode}
            onClose={() => setLoaiMode(null)}
            selectedText={selectedText}
          />
        )}
      </div>

      {isVersionOpen && <VersionHistoryModal onClose={() => setIsVersionOpen(false)} />}
    </div>
  );
};
