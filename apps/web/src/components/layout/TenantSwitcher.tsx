import { useState } from "react";
import { Spinner } from "@lawkit/ui";
import type { TenantMembership } from "@lawai/contracts";
import { useTenantSwitcher } from "./hooks/useTenantSwitcher";
import { getTenantRoleLabel } from "../../utils/tenantRoleLabel";
import * as css from "./tenantSwitcher.css";

/**
 * 사이드바 하단 회사 스위처(시안 B).
 * 멤버십 0개 → 미렌더 / 1개 → 표시 전용 / 2개+ → 드롭다운으로 전환.
 * 외부 클릭 닫기는 투명 backdrop(NotificationBell 패턴 — useRef/useEffect 미사용).
 */
export function TenantSwitcher() {
  const {
    memberships,
    activeMembership,
    switchTo,
    switchingTenantId,
    isSwitchError,
  } = useTenantSwitcher();
  const [isOpen, setIsOpen] = useState(false);

  if (memberships.length === 0) return null;

  const current = activeMembership ?? memberships[0];
  const isSwitching = switchingTenantId !== null;

  const handleSelect = (membership: TenantMembership) => {
    if (membership.isActive) {
      setIsOpen(false);
      return;
    }
    switchTo(membership.tenantId);
  };

  // 1개 소속(대다수 사용자): 전환 UI 없이 현재 회사 표시만.
  if (memberships.length === 1) {
    return (
      <div className={css.root}>
        <div className={css.triggerStatic}>
          <span className={css.badge}>{current.name.charAt(0)}</span>
          <span className={css.name}>{current.name}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={css.root}>
      <button
        type="button"
        className={css.trigger}
        aria-label={`회사 전환 — 현재 ${current.name}`}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <span className={css.badge}>{current.name.charAt(0)}</span>
        <span className={css.name}>{current.name}</span>
        <span className={css.caret}>▲</span>
      </button>

      {isOpen ? (
        <>
          <button
            type="button"
            className={css.backdrop}
            aria-label="회사 목록 닫기"
            onClick={() => setIsOpen(false)}
          />
          <div className={css.panel}>
            <div className={css.panelHeader}>소속 회사 ({memberships.length})</div>
            {memberships.map((membership) => (
              <button
                key={membership.tenantId}
                type="button"
                disabled={isSwitching}
                className={
                  membership.isActive ? `${css.item} ${css.itemActive}` : css.item
                }
                onClick={() => handleSelect(membership)}
              >
                <span className={css.itemBadge}>{membership.name.charAt(0)}</span>
                <span className={css.itemMain}>
                  <span className={css.itemName}>{membership.name}</span>
                  <span className={css.itemRole}>
                    {getTenantRoleLabel(membership.role)}
                  </span>
                </span>
                {membership.isActive ? <span className={css.itemCheck}>✓</span> : null}
                {switchingTenantId === membership.tenantId ? (
                  <span aria-label="전환 중">
                    <Spinner />
                  </span>
                ) : null}
              </button>
            ))}
            {isSwitchError ? (
              <p className={css.errorText}>회사 전환에 실패했습니다. 다시 시도해주세요.</p>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
