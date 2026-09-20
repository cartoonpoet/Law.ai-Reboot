import { useState } from "react";
import type { Editor } from "@tiptap/react";

interface FindMatch {
  from: number;
  to: number;
}

/** 문서에서 찾을 말이 나오는 자리를 모두 모은다(글자 노드 안에서만 — 순수 함수). */
const collectMatches = (editor: Editor, keyword: string): FindMatch[] => {
  if (keyword === "") return [];
  const matches: FindMatch[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    const text = node.text;
    let index = text.indexOf(keyword);
    while (index !== -1) {
      matches.push({ from: pos + index, to: pos + index + keyword.length });
      index = text.indexOf(keyword, index + keyword.length);
    }
  });
  return matches;
};

/**
 * 찾기·바꾸기 로직(SRP) — 화면은 FindReplacePopover 가 맡는다.
 * 찾은 개수는 상태로 두지 않고 매 렌더에 문서에서 다시 센다(파생 값).
 */
export const useFindReplace = (editor: Editor) => {
  const [keyword, setKeyword] = useState("");
  const [replacement, setReplacement] = useState("");

  const matches = collectMatches(editor, keyword);

  const handleFindNext = () => {
    if (matches.length === 0) return;
    const cursor = editor.state.selection.to;
    const next = matches.find((match) => match.from >= cursor) ?? matches[0];
    editor.chain().focus().setTextSelection({ from: next.from, to: next.to }).scrollIntoView().run();
  };

  const handleReplaceAll = () => {
    if (matches.length === 0) return;
    const tr = editor.state.tr;
    // 뒤에서부터 바꿔야 앞쪽 위치가 밀리지 않는다.
    [...matches].reverse().forEach((match) => {
      if (replacement === "") tr.delete(match.from, match.to);
      else tr.insertText(replacement, match.from, match.to);
    });
    editor.view.dispatch(tr);
  };

  return { keyword, setKeyword, replacement, setReplacement, matchCount: matches.length, handleFindNext, handleReplaceAll };
};
