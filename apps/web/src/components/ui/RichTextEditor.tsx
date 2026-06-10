import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";
import * as s from "./RichTextEditor.css";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  ariaLabel: string;
  placeholder?: string;
}

export function RichTextEditor({ value, onChange, ariaLabel }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: { attributes: { "aria-label": ariaLabel, class: s.area } },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) editor.commands.setContent(value, { emitUpdate: false });
  }, [value, editor]);

  if (!editor) return null;
  const btn = (label: string, active: boolean, on: () => void) => (
    <button type="button" className={s.tbBtn} data-active={active} onClick={on} aria-label={label}>
      {label}
    </button>
  );

  return (
    <div className={s.wrap}>
      <div className={s.toolbar}>
        {btn("B", editor.isActive("bold"), () => editor.chain().focus().toggleBold().run())}
        {btn("I", editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run())}
        {btn("S", editor.isActive("strike"), () => editor.chain().focus().toggleStrike().run())}
        {btn("• 목록", editor.isActive("bulletList"), () => editor.chain().focus().toggleBulletList().run())}
        {btn("1. 목록", editor.isActive("orderedList"), () => editor.chain().focus().toggleOrderedList().run())}
        {btn("❝", editor.isActive("blockquote"), () => editor.chain().focus().toggleBlockquote().run())}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
