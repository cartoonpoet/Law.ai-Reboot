import { fireEvent, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useCommandPaletteShortcut } from "./useCommandPaletteShortcut";

describe("useCommandPaletteShortcut", () => {
  it("Ctrl+K 와 ⌘K 를 누르면 검색창을 연다", () => {
    const setOpen = vi.fn();
    renderHook(() => useCommandPaletteShortcut(setOpen));
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    fireEvent.keyDown(document, { key: "K", metaKey: true });
    expect(setOpen).toHaveBeenCalledTimes(2);
    expect(setOpen).toHaveBeenCalledWith(true);
  });

  it("조합 키 없는 k 나 다른 키는 무시한다", () => {
    const setOpen = vi.fn();
    renderHook(() => useCommandPaletteShortcut(setOpen));
    fireEvent.keyDown(document, { key: "k" });
    fireEvent.keyDown(document, { key: "j", ctrlKey: true });
    expect(setOpen).not.toHaveBeenCalled();
  });

  it("언마운트하면 더 이상 반응하지 않는다", () => {
    const setOpen = vi.fn();
    const { unmount } = renderHook(() => useCommandPaletteShortcut(setOpen));
    unmount();
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    expect(setOpen).not.toHaveBeenCalled();
  });
});
