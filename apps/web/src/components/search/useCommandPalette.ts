import { useContext } from "react";
import { CommandPaletteContext } from "./commandPaletteContext";

export const useCommandPalette = () => {
  const palette = useContext(CommandPaletteContext);
  if (!palette) throw new Error("useCommandPalette 는 CommandPaletteProvider 안에서만 쓸 수 있습니다");
  return palette;
};
