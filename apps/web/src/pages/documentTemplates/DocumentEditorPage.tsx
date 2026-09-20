import { useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { Button, Icon } from "@lawkit/ui";
import { Eyebrow } from "../../components/ui/Eyebrow";
import { RichTextEditor } from "../../components/ui/RichTextEditor";
import { LoaiPanel, type LoaiModeTypes } from "../../components/documentEditor/LoaiPanel";
import { SelectionBubble } from "../../components/documentEditor/SelectionBubble";
import { VersionHistoryModal } from "../../components/documentEditor/VersionHistoryModal";
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

  if (editor.isLoading) return <p>불러오는 중…</p>;
  if (editor.isError || !editor.template) return <p>양식을 불러오지 못했습니다.</p>;

  const handleToggleLoai = () => setLoaiMode(loaiMode === null ? "draft" : null);
  const handleRewrite = (text: string) => {
    setSelectedText(text);
    setLoaiMode("rewrite");
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
            const { from, to, empty } = tiptapEditor.state.selection;
            if (empty) return null;
            return <SelectionBubble onRewrite={() => handleRewrite(tiptapEditor.state.doc.textBetween(from, to, " "))} />;
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
