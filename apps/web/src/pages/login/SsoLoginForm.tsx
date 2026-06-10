import { Icon, Button } from "@lawkit/ui";
import { T } from "../../design/tokens";

export function SsoLoginForm() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "14px 16px",
          borderRadius: 10,
          background: T.primaryTint,
          border: `1px solid ${T.primary}22`,
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 9,
            background: T.navy,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon
            name="shieldSolid2"
            size="md"
            style={{ width: 20, height: 20, color: "#fff" }}
          />
        </div>
        <div>
          <div
            style={{
              fontSize: 13.5,
              fontWeight: 700,
              color: T.heading,
            }}
          >
            휴맥스 SSO 계정
          </div>
          <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>
            사내 통합 계정으로 안전하게 로그인합니다.
          </div>
        </div>
      </div>
      <div style={{ display: "grid" }}>
        <Button
          size="large"
          iconLeft={
            <Icon name="logIn" size="sm" style={{ width: 15, height: 15 }} />
          }
        >
          휴맥스 SSO로 계속
        </Button>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 6,
          fontSize: 12,
          color: T.faint,
          lineHeight: 1.5,
        }}
      >
        <Icon
          name="info"
          size="sm"
          style={{
            width: 13,
            height: 13,
            marginTop: 1,
            flexShrink: 0,
          }}
        />
        SSO 연동 계정이 없으면 시스템 관리자(내선 8230)에게 문의하세요.
      </div>
    </div>
  );
}
