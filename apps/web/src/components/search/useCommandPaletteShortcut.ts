import { useEffect } from "react";

const SHORTCUT_KEY = "k";

/**
 * 통합검색 전역 단축키 Ctrl+K(맥 ⌘K).
 * 포커스가 어디에 있든(본문 빈 곳 포함) 받아야 해서 요소 이벤트 핸들러로는 표현할 수 없다 —
 * 문서 keydown 구독이라 useEffect 로 연결하고 언마운트 때 해제한다(외부 이벤트 구독 예외).
 * setOpen 은 useState 의 setter 를 받아 구독이 렌더마다 다시 걸리지 않게 한다.
 */
export const useCommandPaletteShortcut = (setOpen: (isOpen: boolean) => void) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== SHORTCUT_KEY) return;
      event.preventDefault();
      setOpen(true);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [setOpen]);
};
