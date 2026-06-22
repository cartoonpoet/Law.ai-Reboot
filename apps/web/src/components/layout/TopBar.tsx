import { Icon, Input } from "@lawkit/ui";
import { T } from "../../design/tokens";
import { NotificationBell } from "./NotificationBell";

export function TopBar() {
  return (
    <header
      style={{
        height: 54,
        flexShrink: 0,
        background: T.surface,
        borderBottom: `1px solid ${T.border}`,
        display: "flex",
        alignItems: "center",
        padding: "0 20px",
        gap: 14,
        position: "sticky",
        top: 0,
        zIndex: 20,
      }}
    >
      <div style={{ flex: 1, maxWidth: 400 }}>
        <Input
          placeholder="계약·자문·송무·문서를 통합 검색하세요"
          inputSize="small"
          leftIcon={
            <Icon
              name="search"
              size="sm"
              style={{ width: 15, height: 15, color: T.faint }}
            />
          }
        />
      </div>
      <div style={{ flex: 1 }} />
      <NotificationBell />
      <button
        style={{
          width: 34,
          height: 34,
          borderRadius: 7,
          border: "none",
          background: "transparent",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        aria-label="설정"
      >
        <Icon
          name="settings"
          size="sm"
          style={{ width: 17, height: 17, color: T.muted }}
        />
      </button>
    </header>
  );
}
