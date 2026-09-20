import type { Editor } from "@tiptap/react";
import { Icon } from "@lawkit/ui";
import { ToolbarButton } from "./ToolbarButton";
import { FontGroup } from "./FontGroup";
import { TextFormatGroup } from "./TextFormatGroup";
import { ParagraphGroup } from "./ParagraphGroup";
import { InsertGroup } from "./InsertGroup";
import * as s from "../RichTextEditor.css";
import * as css from "./documentToolbar.css";

interface DocumentToolbarProps {
  editor: Editor;
  /** 표 도구를 같이 보일지 */
  withTable: boolean;
  /** 로아이 도우미 열기·닫기. 없으면 로아이 칸이 나오지 않는다. */
  onLoaiClick?: () => void;
  isLoaiOpen?: boolean;
}

/**
 * 문서 편집기 전용 서식 리본 — 워드처럼 두 줄로 나눈다.
 * 첫 줄은 글자(글꼴·크기·꾸미기), 둘째 줄은 문단과 넣기 도구 + 로아이.
 * 짧은 에디터(계약서 검토 요청·자문 등)는 이 리본을 쓰지 않고 기존 한 줄 툴바 그대로다.
 */
export const DocumentToolbar = ({ editor, withTable, onLoaiClick, isLoaiOpen = false }: DocumentToolbarProps) => (
  <div className={css.ribbon}>
    <div className={css.row}>
      <FontGroup editor={editor} />
      <span className={s.sep} />
      <TextFormatGroup editor={editor} />
    </div>

    <div className={`${css.row} ${css.rowSecond}`}>
      <ParagraphGroup editor={editor} />
      <span className={s.sep} />
      <InsertGroup editor={editor} withTable={withTable} />

      {onLoaiClick && (
        <>
          <span className={s.sep} />
          <div className={s.group}>
            <ToolbarButton
              tip={isLoaiOpen ? "로아이 도우미 닫기" : "로아이 도우미 열기"}
              isActive={isLoaiOpen}
              onClick={onLoaiClick}
              className={s.loaiBtn}
            >
              <span className={s.loaiLabel}>
                <Icon name="autoAwesome" size="sm" className={s.icon} />
                로아이 도우미
              </span>
            </ToolbarButton>
          </div>
        </>
      )}
    </div>
  </div>
);
