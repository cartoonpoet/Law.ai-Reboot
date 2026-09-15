import { useState } from "react";
import type { ReactNode } from "react";
import { CommandPaletteContext } from "./commandPaletteContext";
import { useCommandPaletteShortcut } from "./useCommandPaletteShortcut";

interface CommandPaletteProviderProps {
  children: ReactNode;
}

// 통합검색창 열림 상태를 앱 틀에서 공유한다(사이드바 버튼 · Ctrl+K · 검색창).
export const CommandPaletteProvider = ({ children }: CommandPaletteProviderProps) => {
  const [isOpen, setIsOpen] = useState(false);
  useCommandPaletteShortcut(setIsOpen);

  return (
    <CommandPaletteContext.Provider
      value={{ isOpen, open: () => setIsOpen(true), close: () => setIsOpen(false) }}
    >
      {children}
    </CommandPaletteContext.Provider>
  );
};
