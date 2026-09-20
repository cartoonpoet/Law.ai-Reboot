import { useRef, type ChangeEvent } from "react";
import type { Editor } from "@tiptap/react";
import { ToolbarButton } from "./ToolbarButton";
import { FindReplacePopover } from "./FindReplacePopover";
import { promptForLink } from "../editorCommands";
import { IconUndo, IconRedo, IconLink, IconDivider, IconImage, IconTable, IconPageBreak } from "../EditorIcons";
import * as s from "../RichTextEditor.css";

interface InsertGroupProps {
  editor: Editor;
  /** 표 도구를 같이 보일지 */
  withTable: boolean;
}

/** 리본 둘째 줄 둘째 칸 — 실행취소·다시실행·찾기바꾸기·링크·구분선·이미지·표·페이지 나누기. */
export const InsertGroup = ({ editor, withTable }: InsertGroupProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isInTable = withTable && editor.isActive("table");

  const handlePickImage = () => fileInputRef.current?.click();

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => editor.chain().focus().setImage({ src: String(reader.result), alt: file.name }).run();
    reader.readAsDataURL(file);
  };

  return (
    <>
      <div className={s.group}>
        <ToolbarButton tip="실행 취소 (Ctrl+Z)" isDisabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>
          <IconUndo />
        </ToolbarButton>
        <ToolbarButton tip="다시 실행 (Ctrl+Shift+Z)" isDisabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>
          <IconRedo />
        </ToolbarButton>
        <FindReplacePopover editor={editor} />
      </div>

      <span className={s.sep} />

      <div className={s.group}>
        <ToolbarButton tip="링크" isActive={editor.isActive("link")} onClick={() => promptForLink(editor)}>
          <IconLink />
        </ToolbarButton>
        <ToolbarButton tip="구분선" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <IconDivider />
        </ToolbarButton>
        <ToolbarButton tip="그림 넣기 (로고·인감)" onClick={handlePickImage}>
          <IconImage />
        </ToolbarButton>
        {/* lds-exempt: 숨긴 파일 선택기 — 화면에 보이지 않는 트리거라 LDS FileUpload(드롭 영역 UI)로 대체할 수 없다. MentionEditor 첨부와 같은 방식. */}
        <input ref={fileInputRef} type="file" hidden accept="image/*" onChange={handleImageChange} />
        {withTable && (
          <ToolbarButton
            tip="표 넣기 (3×3)"
            isActive={editor.isActive("table")}
            onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          >
            <IconTable />
          </ToolbarButton>
        )}
        <ToolbarButton tip="페이지 나누기" onClick={() => editor.chain().focus().setPageBreak().run()}>
          <IconPageBreak />
        </ToolbarButton>
      </div>

      {isInTable && (
        <>
          <span className={s.sep} />
          <div className={s.group}>
            <ToolbarButton tip="행 추가" onClick={() => editor.chain().focus().addRowAfter().run()}>
              <span className={s.glyph}>＋행</span>
            </ToolbarButton>
            <ToolbarButton tip="열 추가" onClick={() => editor.chain().focus().addColumnAfter().run()}>
              <span className={s.glyph}>＋열</span>
            </ToolbarButton>
            <ToolbarButton tip="표 지우기" onClick={() => editor.chain().focus().deleteTable().run()}>
              <span className={s.glyph}>표 삭제</span>
            </ToolbarButton>
          </div>
        </>
      )}
    </>
  );
};
