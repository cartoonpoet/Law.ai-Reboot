import { useRef, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { Button, EmptyState, Icon } from "@lawkit/ui";
import type { Editor } from "@tiptap/react";
import { Eyebrow } from "../../components/ui/Eyebrow";
import { RichTextEditor } from "../../components/ui/RichTextEditor";
import { LoaiPanel, type LoaiModeTypes } from "../../components/documentEditor/LoaiPanel";
import { SelectionBubble } from "../../components/documentEditor/SelectionBubble";
import { VersionHistoryModal } from "../../components/documentEditor/VersionHistoryModal";
import { DocumentEditorSkeleton } from "./DocumentEditorSkeleton";
import { useDocumentEditor } from "./hooks/useDocumentEditor";
import * as css from "../mockups/documentEditor/documentEditorMock.css";

const countPages = (html: string): number => (html.match(/data-page-break/g)?.length ?? 0) + 1;

export const DocumentEditorPage = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const initialHtml = (location.state as { initialHtml?: string } | null)?.initialHtml;
  const editor = useDocumentEditor(id as string, initialHtml);

  const [loaiMode, setLoaiMode] = useState<LoaiModeTypes | null>(null);
  const [selectedText, setSelectedText] = useState("");
  const [selectedRange, setSelectedRange] = useState<{ from: number; to: number } | null>(null);
  // 살아있는 tiptap 에디터 인스턴스 — renderOverlay(렌더 중 콜백)에서만 얻을 수 있어 ref로 잡아 둔다
  // (외부 명령형 라이브러리 연동: useRef 예외 케이스, useEffect 없이 선언적으로 유지).
  const liveEditorRef = useRef<Editor | null>(null);

  if (editor.isLoading) return <DocumentEditorSkeleton />;
  if (editor.isError || !editor.template) {
    return (
      <div className={css.pageStatus}>
        <EmptyState
          icon={<Icon name="alertTriangle" size="lg" />}
          title="양식을 불러오지 못했습니다"
          description="잠시 후 다시 시도해 주세요."
        />
      </div>
    );
  }

  const handleToggleLoai = () => setLoaiMode(loaiMode === null ? "draft" : null);
  const handleRewrite = (text: string, range: { from: number; to: number }) => {
    setSelectedText(text);
    setSelectedRange(range);
    setLoaiMode("rewrite");
  };
  const handleApplyRewrite = (rewrittenText: string) => {
    const liveEditor = liveEditorRef.current;
    if (!liveEditor || !selectedRange) return;
    // 선택했던 범위를 고친 문장으로 실제로 교체한다 — onUpdate가 자동으로 editor.setContent(HTML)까지 반영한다.
    liveEditor.chain().focus().insertContentAt(selectedRange, rewrittenText).run();
    setSelectedRange(null);
  };

  return (
    <div>
      <div className={css.editorHead}>
        <div className={css.editorTitleGroup}>
          <Eyebrow>계약 관리 · 표준양식 관리</Eyebrow>
          <div className={css.editorTitleRow}>
            <h1 className={css.editorTitle}>{editor.template.name}</h1>
            <span className={css.verChip}>v{editor.template.currentVersionNo}</span>
          </div>
        </div>
        <div className={css.editorActions}>
          <Button variant="outline" color="secondary" iconLeft={<Icon name="history" size="sm" />} onClick={editor.openVersions}>
            버전 이력
          </Button>
          <Button iconLeft={<Icon name="save" size="sm" />} disabled={editor.isSaving} onClick={() => void editor.save()}>
            {editor.isSaving ? "저장 중…" : "저장하기"}
          </Button>
        </div>
      </div>

      <div className={loaiMode === null ? css.editorLayout.solo : css.editorLayout.withPanel}>
        <RichTextEditor
          ariaLabel="표준양식 문서 편집기"
          value={editor.content}
          onChange={editor.setContent}
          withTable
          withFullToolbar
          onLoaiClick={handleToggleLoai}
          isLoaiOpen={loaiMode !== null}
          wrapClassName={css.docShell}
          areaClassName={css.docPage}
          footerExtra={<span className={css.docFoot}>총 {countPages(editor.content)}페이지</span>}
          renderOverlay={(tiptapEditor) => {
            liveEditorRef.current = tiptapEditor;
            const { from, to, empty } = tiptapEditor.state.selection;
            if (empty) return null;
            return (
              <SelectionBubble
                onRewrite={() => handleRewrite(tiptapEditor.state.doc.textBetween(from, to, " "), { from, to })}
              />
            );
          }}
        />

        {loaiMode !== null && (
          <LoaiPanel
            mode={loaiMode}
            onModeChange={setLoaiMode}
            onClose={() => setLoaiMode(null)}
            selectedText={selectedText}
            onDraftCreated={(html) => {
              editor.setContent(html);
              setLoaiMode(null);
            }}
            hasDocumentContent={editor.content.replace(/<[^>]*>/g, "").trim() !== ""}
            onGenerate={editor.generateDraft}
            onRewrite={(instruction) => editor.rewriteSelection(selectedText, instruction)}
            onApplyRewrite={handleApplyRewrite}
            onReview={() => void editor.runReview()}
            reviewFindings={editor.reviewFindings}
            isReviewing={editor.isReviewing}
          />
        )}
      </div>

      {editor.isVersionOpen && (
        <VersionHistoryModal versions={editor.versions} onRevert={(versionNo) => void editor.revert(versionNo)} onClose={editor.closeVersions} />
      )}
    </div>
  );
};
