import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon, Spinner } from "@lawkit/ui";
import type { TenantMembership } from "@lawai/contracts";
import { clearTokens } from "../../api/tokens";
import { cx } from "../../pages/contract/cx";
import { getTenantRoleLabel } from "../../utils/tenantRoleLabel";
import { UserAvatar } from "../ui/UserAvatar";
import { useMe } from "./hooks/useMe";
import { useTenantSwitcher } from "./hooks/useTenantSwitcher";
import * as css from "./profileMenu.css";

/**
 * 사이드바 맨 아래 내 이름 메뉴 — 설정(내 정보 설정) · 회사 전환(소속 2곳 이상) · 로그아웃.
 * 헤더의 설정 버튼과 사이드바 회사 전환 칸을 이 한곳으로 모았다.
 * 외부 클릭은 투명 backdrop 으로 닫는다(useRef/useEffect 미사용).
 */
export const ProfileMenu = () => {
  const navigate = useNavigate();
  const { me } = useMe();
  const { memberships, activeMembership, switchTo, switchingTenantId, isSwitchError } = useTenantSwitcher();
  const [isOpen, setIsOpen] = useState(false);

  const roleLabel = activeMembership ? getTenantRoleLabel(activeMembership.role) : "";
  const summary = [activeMembership?.name, roleLabel].filter(Boolean).join(" · ");
  const hasTenantChoice = memberships.length > 1;
  const isSwitching = switchingTenantId !== null;

  const handleSettings = () => {
    setIsOpen(false);
    // 개인 설정(내 정보·알림·비밀번호). 서비스 전체 설정인 시스템 관리(/system)와 다르다.
    navigate("/settings/profile");
  };

  const handleLogout = () => {
    clearTokens();
    navigate("/login");
  };

  const handleSwitch = (membership: TenantMembership) => {
    if (membership.isActive) return;
    switchTo(membership.tenantId);
  };

  return (
    <div className={css.root}>
      <button
        type="button"
        className={css.trigger}
        aria-label="내 계정 메뉴"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <UserAvatar name={me?.name ?? null} avatarUrl={me?.avatarUrl ?? null} size="small" isDecorative />
        <span className={css.main}>
          <span className={css.name}>{me?.name ?? ""}</span>
          <span className={css.sub}>{summary}</span>
        </span>
        <span className={css.caret} aria-hidden="true">▲</span>
      </button>

      {isOpen && (
        <>
          <button type="button" className={css.backdrop} aria-label="내 계정 메뉴 닫기" onClick={() => setIsOpen(false)} />
          <div className={css.panel} role="menu" aria-label="내 계정">
            <div className={css.who}>
              <span className={css.whoName}>{me?.name ?? ""}</span>
              <span className={css.whoSub}>{me?.email ?? ""}</span>
            </div>

            <button type="button" role="menuitem" className={css.menuItem} onClick={handleSettings}>
              <Icon name="settings" size="sm" className={css.menuIcon} />
              설정
            </button>

            {hasTenantChoice && (
              <div className={css.group}>
                <div className={css.groupLabel}>회사 전환 ({memberships.length})</div>
                {memberships.map((membership) => (
                  <button
                    key={membership.tenantId}
                    type="button"
                    role="menuitemradio"
                    aria-checked={membership.isActive}
                    disabled={isSwitching}
                    className={cx(css.tenantItem, membership.isActive && css.tenantItemActive)}
                    onClick={() => handleSwitch(membership)}
                  >
                    <span className={css.tenantBadge}>{membership.name.charAt(0)}</span>
                    <span className={css.tenantMain}>
                      <span className={css.tenantName}>{membership.name}</span>
                      <span className={css.tenantRole}>{getTenantRoleLabel(membership.role)}</span>
                    </span>
                    {membership.isActive && <span className={css.tenantCheck} aria-hidden="true">✓</span>}
                    {switchingTenantId === membership.tenantId && (
                      <span aria-label="전환 중">
                        <Spinner />
                      </span>
                    )}
                  </button>
                ))}
                {isSwitchError && <p className={css.errorText}>회사 전환에 실패했습니다. 다시 시도해주세요.</p>}
              </div>
            )}

            <button type="button" role="menuitem" className={cx(css.menuItem, css.menuItemDanger)} onClick={handleLogout}>
              <Icon name="logOut" size="sm" className={css.menuIcon} />
              로그아웃
            </button>
          </div>
        </>
      )}
    </div>
  );
};
