import type { ReactNode } from "react";
import { Icon } from "@lawkit/ui";
import * as css from "./aiNote.css";

interface AiNoteProps {
  children: ReactNode;
}

/** AI 보조 한 줄 — AI 아이콘 + 청록 톤으로 "AI 가 붙인 판단·준비물"을 사람이 쓴 내용과 구분한다. */
export const AiNote = ({ children }: AiNoteProps) => (
  <span className={css.aiNote}>
    <Icon name="autoAwesome" size="sm" className={css.aiIcon} />
    <span>{children}</span>
  </span>
);
