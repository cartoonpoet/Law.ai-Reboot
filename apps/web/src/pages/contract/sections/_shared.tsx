import type { ReactNode } from "react";
import { Icon, themeVars } from "@lawkit/ui";
import type { IconName } from "@lawkit/ui";
import * as css from "../contractRequest.css";

export function CardTitle({ icon, num, children }: { icon: IconName; num: number; children: ReactNode }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span style={{ width: 22, height: 22, borderRadius: 6, background: themeVars.color.accentPrimary, color: themeVars.color.textInverse, fontSize: 12, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{num}</span>
      <Icon name={icon} size="sm" style={{ width: 16, height: 16, color: themeVars.color.textSecondary }} />
      {children}
    </span>
  );
}

export function ErrText({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <div role="alert" className={css.errText}>{msg}</div>;
}
