import type { ComponentProps, ReactNode } from "react";
import { InputGroup, Tooltip, Icon, themeVars } from "@lawkit/ui";
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

type FieldProps = Omit<ComponentProps<typeof InputGroup>, "label"> & {
  label?: ReactNode;
  /** 라벨 옆 ⓘ 아이콘에 표시할 도움말 */
  info?: string;
};

/**
 * InputGroup 래퍼. `info`를 주면 라벨 옆에 lawkit Tooltip + ⓘ 아이콘을 붙인다.
 * (InputGroup의 label은 string 타입이지만 런타임은 ReactNode를 그대로 렌더한다.)
 */
export function Field({ label, info, children, ...rest }: FieldProps) {
  const labelNode = info ? (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      {label}
      <Tooltip content={info}>
        <Icon name="info" size="sm" style={{ width: 13, height: 13, color: themeVars.color.textMuted }} />
      </Tooltip>
    </span>
  ) : (
    label
  );
  return (
    <InputGroup label={labelNode as unknown as string} {...rest}>
      {children}
    </InputGroup>
  );
}

export function ErrText({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <div role="alert" className={css.errText}>{msg}</div>;
}
