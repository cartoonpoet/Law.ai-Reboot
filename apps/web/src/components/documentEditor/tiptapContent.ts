import { generateHTML, generateJSON } from "@tiptap/core";
import { BASE_EDITOR_EXTENSIONS } from "../ui/useRichTextEditor";
import { TABLE_EXTENSIONS, FULL_TOOLBAR_EXTENSIONS } from "../ui/RichTextEditor";

/**
 * 문서 편집기(DocumentEditorPage)는 항상 withTable+withFullToolbar로 RichTextEditor를 띄우므로,
 * 저장용 Tiptap JSON 변환 스키마도 그 편집기가 실제로 등록하는 확장 전체(표·글꼴·첨자·그림·페이지 나누기
 * 포함)를 기준으로 삼는다 — BASE_EDITOR_EXTENSIONS만 쓰면 표·그림 등이 스키마에 없는 태그로 취급돼
 * generateJSON/generateHTML 왕복 중 내용이 깨진다(예: <table>이 문단으로 납작해짐).
 */
const DOCUMENT_EDITOR_EXTENSIONS = [...BASE_EDITOR_EXTENSIONS, ...TABLE_EXTENSIONS, ...FULL_TOOLBAR_EXTENSIONS];

/** 편집기 HTML(RichTextEditor의 value/onChange) → 저장용 Tiptap JSON(정본). */
export const htmlToTiptapJson = (html: string): Record<string, unknown> =>
  generateJSON(html || "<p></p>", DOCUMENT_EDITOR_EXTENSIONS) as Record<string, unknown>;

/** 저장된 Tiptap JSON → 편집기에 채울 HTML. */
export const tiptapJsonToHtml = (json: Record<string, unknown>): string =>
  generateHTML(json, DOCUMENT_EDITOR_EXTENSIONS);
