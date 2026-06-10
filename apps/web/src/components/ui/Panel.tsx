import { T } from "../../design/tokens";
import { Icon } from "@lawkit/ui";
import type { IconName } from "@lawkit/ui";

interface PanelProps {
  title?: string;
  icon?: IconName;
  badge?: number;
  actions?: React.ReactNode;
  children: React.ReactNode;
  flush?: boolean;
  pad?: number;
  style?: React.CSSProperties;
}

export function Panel({ title, icon, badge, actions, children, flush, pad, style }: PanelProps) {
  return (
    <div
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: T.radius,
        boxShadow: T.shadowCard,
        overflow: "hidden",
        ...style,
      }}
    >
      {title && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "11px 14px",
            borderBottom: `1px solid ${T.border}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            {icon && (
              <Icon
                name={icon}
                size="sm"
                style={{ width: 14, height: 14, color: T.muted }}
              />
            )}
            <span
              style={{
                fontSize: 13.5,
                fontWeight: 700,
                color: T.heading,
                letterSpacing: "-0.01em",
              }}
            >
              {title}
            </span>
            {badge != null && (
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: T.muted,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {badge}
              </span>
            )}
          </div>
          {actions}
        </div>
      )}
      <div style={flush ? {} : { padding: pad != null ? pad : 14 }}>
        {children}
      </div>
    </div>
  );
}
