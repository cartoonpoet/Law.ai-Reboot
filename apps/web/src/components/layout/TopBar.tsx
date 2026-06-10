import { Icon, Input } from "@lawkit/ui";
import { T } from "../../design/tokens";

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
      <button
        style={{
          position: "relative",
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
        aria-label="알림"
      >
        <Icon
          name="bell"
          size="sm"
          style={{ width: 17, height: 17, color: T.muted }}
        />
        <span
          style={{
            position: "absolute",
            top: 7,
            right: 7,
            width: 6,
            height: 6,
            borderRadius: 999,
            background: T.danger,
            border: "1.5px solid #fff",
          }}
        />
      </button>
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
