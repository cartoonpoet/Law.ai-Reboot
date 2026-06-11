import type { ReactNode } from "react";
import { themeVars } from "@lawkit/ui";
import * as css from "../contractRequest.css";

export function CardTitle({ num, children }: { num: number; children: ReactNode }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span
        style={{
          width: 22,
          height: 22,
          borderRadius: 6,
          background: `color-mix(in srgb, ${themeVars.color.accentPrimary} 10%, ${themeVars.color.neutralSurface})`,
          color: themeVars.color.accentPrimary,
          fontSize: 12,
          fontWeight: 800,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {num}
      </span>
      {children}
    </span>
  );
}

export function ErrText({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <div role="alert" className={css.errText}>{msg}</div>;
}
