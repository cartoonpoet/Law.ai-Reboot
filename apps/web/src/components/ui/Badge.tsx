import type { ReactNode } from "react";
import * as css from "./badge.css";

type BadgeColorTypes = Exclude<css.ToneTypes, "neutral">;

interface BadgeProps {
  color?: BadgeColorTypes;
  size?: "sm" | "md";
  dot?: boolean;
  children: ReactNode;
}

export const Badge = ({ color = "secondary", size = "md", dot = false, children }: BadgeProps) => (
  <span className={`${css.tone[color]} ${css.badgeSize[size]}`}>
    {dot && <span className={css.badgeDot[color]} />}
    {children}
  </span>
);
