import { Spinner } from "@lawkit/ui";
import { useTenantSwitcher } from "../../../components/layout/hooks/useTenantSwitcher";
import { cx } from "../../contract/cx";
import { getTenantRoleLabel } from "../../../utils/tenantRoleLabel";
import * as css from "../settings.css";

/** 소속 회사 — 회사별 역할(보기만). 역할은 각 회사 관리자가, 전환은 내 이름 메뉴에서. */
export const CompaniesSection = () => {
  const { memberships, isLoading } = useTenantSwitcher();

  return (
    <section className={css.card} aria-labelledby="settings-companies-title">
      <div>
        <h2 id="settings-companies-title" className={css.cardTitle}>소속 회사</h2>
        <p className={css.cardDesc}>역할은 각 회사의 관리자가 정해요. 회사 전환은 사이드바 아래 내 이름 메뉴에서 할 수 있어요.</p>
      </div>

      {isLoading && <Spinner label="불러오는 중..." />}
      {!isLoading && memberships.length === 0 && <p className={css.empty}>소속된 회사가 없어요.</p>}
      {!isLoading && memberships.length > 0 && (
        <table className={css.table}>
          <thead>
            <tr>
              <th className={css.th}>회사</th>
              <th className={css.th}>역할</th>
              <th className={css.th}>상태</th>
            </tr>
          </thead>
          <tbody>
            {memberships.map((membership) => (
              <tr key={membership.tenantId}>
                <td className={cx(css.td, membership.isActive && css.tdStrong)}>{membership.name}</td>
                <td className={css.td}>{getTenantRoleLabel(membership.role)}</td>
                <td className={css.td}>
                  <span className={cx(css.chip, !membership.isActive && css.chipMuted)}>
                    {membership.isActive ? "사용 중" : "전환 가능"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
};
