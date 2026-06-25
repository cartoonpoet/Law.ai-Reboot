import "@testing-library/jest-dom";

// jsdom 미구현 API 폴리필 — prosemirror-view(posAtCoords)와 tiptap placeholder의 viewport
// 추적이 document.elementFromPoint를 호출하는데 jsdom에 없어 MentionEditor 마운트 시 throw한다.
// 좌표 기반 히트테스트는 단위 테스트에서 의미가 없으므로 no-op 스텁으로 충분하다.
if (typeof document !== "undefined" && !document.elementFromPoint) {
  document.elementFromPoint = () => null;
  document.elementsFromPoint = () => [];
}
