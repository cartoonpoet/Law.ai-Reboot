import type { ReactNode } from "react";
import * as css from "./badge.css";

interface TagProps {
  color?: css.ToneTypes;
  children: ReactNode;
}

export const Tag = ({ color = "neutral", children }: TagProps) => (
  <span className={`${css.tone[color]} ${css.tag}`}>{children}</span>
);
