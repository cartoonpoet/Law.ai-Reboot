import { useState } from "react";
import { Button, Spinner } from "@lawkit/ui";
import type { TenantRole } from "@lawai/contracts";
import { useMembers } from "./useMembers";
import { InviteMembersModal } from "./InviteMembersModal";
import { getTenantRoleLabel } from "../../utils/tenantRoleLabel";
import * as css from "./members.css";

const formatDate = (iso: string): string => new Date(iso).toLocaleDateString("ko-KR");

export function MembersPage() {
  // 목록 조회 실패는 에러 경계가 본문을 오류 페이지로 바꾼다(useMembers meta: page).
  const { members, invites, isLoading, invite, isInviting, resend, cancel } = useMembers();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [resentInviteId, setResentInviteId] = useState<string | null>(null);

  const handleResend = async (inviteId: string) => {
    try {
      await resend(inviteId);
      setResentInviteId(inviteId);
    } catch {
      // 실패는 전역 토스트가 알린다 — "재발송됨" 표시만 건너뛴다.
    }
  };

  if (isLoading) {
    return (
      <div className={css.page}>
        <Spinner label="불러오는 중..." />
      </div>
    );
  }

  return (
    <div className={css.page}>
      <div className={css.headRow}>
        <h1 className={css.title}>멤버 관리</h1>
        <div className={css.grow} />
        <Button onClick={() => setIsInviteOpen(true)}>+ 멤버 초대</Button>
      </div>

      <section className={css.card}>
        <div className={css.cardHead}>멤버 ({members.length})</div>
        <table className={css.table}>
          <thead>
            <tr>
              <th className={css.th}>이름</th>
              <th className={css.th}>이메일</th>
              <th className={css.th}>역할</th>
              <th className={css.th}>합류일</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.userId}>
                <td className={`${css.td} ${css.emailCell}`}>{m.name}</td>
                <td className={css.td}>{m.email}</td>
                <td className={css.td}>{getTenantRoleLabel(m.role as TenantRole)}</td>
                <td className={css.td}>{formatDate(m.joinedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {members.length === 0 ? <p className={css.empty}>멤버가 없습니다.</p> : null}
      </section>

      <section className={css.card}>
        <div className={css.cardHead}>초대 대기 ({invites.length})</div>
        {invites.length === 0 ? (
          <p className={css.empty}>대기 중인 초대가 없습니다.</p>
        ) : (
          <table className={css.table}>
            <thead>
              <tr>
                <th className={css.th}>이메일</th>
                <th className={css.th}>역할</th>
                <th className={css.th}>만료일</th>
                <th className={css.th} />
              </tr>
            </thead>
            <tbody>
              {invites.map((i) => (
                <tr key={i.id}>
                  <td className={`${css.td} ${css.emailCell}`}>{i.email}</td>
                  <td className={css.td}>{getTenantRoleLabel(i.role as TenantRole)}</td>
                  <td className={css.td}>{formatDate(i.expiresAt)}</td>
                  <td className={css.td}>
                    <button
                      type="button"
                      className={css.linkButton}
                      onClick={() => void handleResend(i.id)}
                    >
                      {resentInviteId === i.id ? "재발송됨" : "재발송"}
                    </button>{" "}
                    <button
                      type="button"
                      className={css.dangerLinkButton}
                      onClick={() => void cancel(i.id)}
                    >
                      취소
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <InviteMembersModal
        isOpen={isInviteOpen}
        isInviting={isInviting}
        onClose={() => setIsInviteOpen(false)}
        onInvite={(emails, role) => invite({ emails, role })}
      />
    </div>
  );
}
