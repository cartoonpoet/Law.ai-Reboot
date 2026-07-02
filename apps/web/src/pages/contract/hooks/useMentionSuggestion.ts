import { createRoot, type Root } from "react-dom/client";
import { createElement } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { lightThemeClass } from "@lawkit/ui";
import type { SuggestionProps, SuggestionKeyDownProps } from "@tiptap/suggestion";
import type { MentionNodeAttrs, MentionOptions } from "@tiptap/extension-mention";
import { queryClient } from "../../../lib/queryClient";
import { MentionList, type MentionListHandle, type MentionItem } from "../sections/MentionList";

/** 드롭다운을 커서 하단에서 띄울 세로 오프셋(px). */
const DROPDOWN_OFFSET_PX = 4;

/** mention 노드에 삽입될 attrs(=tiptap MentionNodeAttrs). id=userId, label=순수 표시이름. */
export type MentionPicked = MentionNodeAttrs;

/** MentionEditor.suggestion으로 넘기는 설정(Mention 확장의 suggestion 옵션 형태). */
export type MentionSuggestion = MentionOptions<MentionItem, MentionNodeAttrs>["suggestion"];

/**
 * tiptap Mention의 suggestion 설정을 만드는 팩토리 훅.
 *
 * 검색은 hook(useUserSearch)을 써야 하는데 suggestion.items는 비훅 컨텍스트라 직접 호출이 어렵다.
 * → items는 빈 배열을 반환하고, 실제 검색·후보 렌더·키보드 네비는 render가 포털로 마운트하는
 * MentionList(React 컴포넌트)가 query를 받아 react-query로 수행한다.
 * tiptap suggestion render는 명령형 마운트를 요구하므로 createRoot/ref 패턴을 이 경계에서만 허용한다.
 */
export const useMentionSuggestion = (): MentionSuggestion => ({
  char: "@",
  // 후보는 MentionList가 query로 직접 검색 → items는 빈 배열(렌더는 query 기반).
  items: () => [],
  render: () => {
    let container: HTMLDivElement | null = null;
    let root: Root | null = null;
    let handleRef: MentionListHandle | null = null;

    const positionAt = (props: SuggestionProps<MentionItem, MentionNodeAttrs>) => {
      const rect = props.clientRect?.();
      if (!container || !rect) return;
      container.style.top = `${rect.bottom + DROPDOWN_OFFSET_PX}px`;
      container.style.left = `${rect.left}px`;
    };

    const renderList = (props: SuggestionProps<MentionItem, MentionNodeAttrs>) => {
      if (!root) return;
      root.render(
        createElement(
          QueryClientProvider,
          { client: queryClient },
          createElement(MentionList, {
            query: props.query,
            onPick: (item: MentionPicked) => props.command(item),
            registerHandle: (handle: MentionListHandle | null) => {
              handleRef = handle;
            },
          }),
        ),
      );
      positionAt(props);
    };

    return {
      onStart: (props) => {
        container = document.createElement("div");
        // body로 포털되므로 테마 토큰 스코프를 함께 부여(lawkit 모달 선례와 동일).
        container.className = lightThemeClass;
        container.style.position = "fixed";
        document.body.appendChild(container);
        root = createRoot(container);
        renderList(props);
      },
      onUpdate: (props) => renderList(props),
      onKeyDown: (props: SuggestionKeyDownProps) => handleRef?.onKeyDown(props.event) ?? false,
      onExit: () => {
        root?.unmount();
        container?.remove();
        root = null;
        container = null;
        handleRef = null;
      },
    };
  },
});
