import { useState } from "react";
import { Button, Dropdown, Modal } from "@lawkit/ui";
import type { InviteMembersResponse, TenantRole } from "@lawai/contracts";
import { getTenantRoleLabel } from "../../utils/tenantRoleLabel";
import * as css from "./members.css";

interface InviteMembersModalProps {
  isOpen: boolean;
  isInviting: boolean;
  onClose: () => void;
  onInvite: (emails: string[], role: TenantRole) => Promise<InviteMembersResponse>;
}

const ROLE_OPTIONS: TenantRole[] = [
  "general",
  "contractManager",
  "inHouseCounsel",
  "outsideCounsel",
  "sealManager",
];

// 줄바꿈/쉼표 구분 이메일 파싱 — 공백 제거 + 중복 제거 + '@' 포함만.
const parseEmails = (raw: string): string[] =>
  Array.from(
    new Set(
      raw
        .split(/[\n,]/)
        .map((e) => e.trim())
        .filter((e) => e.includes("@")),
    ),
  );

export function InviteMembersModal({
  isOpen,
  isInviting,
  onClose,
  onInvite,
}: InviteMembersModalProps) {
  const [emailsRaw, setEmailsRaw] = useState("");
  const [role, setRole] = useState<TenantRole>("general");
  const [result, setResult] = useState<InviteMembersResponse | null>(null);
  const [isFailed, setIsFailed] = useState(false);

  const emails = parseEmails(emailsRaw);

  const handleClose = () => {
    setEmailsRaw("");
    setRole("general");
    setResult(null);
    setIsFailed(false);
    onClose();
  };

  const handleInvite = async () => {
    setIsFailed(false);
    try {
      const res = await onInvite(emails, role);
      setResult(res);
      setEmailsRaw("");
    } catch {
      setIsFailed(true);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={handleClose}
      title="멤버 초대"
      footer={
        <>
          <Button variant="outline" color="secondary" onClick={handleClose}>
            닫기
          </Button>
          <Button disabled={isInviting || emails.length === 0} onClick={() => void handleInvite()}>
            초대 메일 발송{emails.length > 0 ? ` (${emails.length})` : ""}
          </Button>
        </>
      }
    >
      <div className={css.modalBody}>
        <textarea
          className={css.textarea}
          value={emailsRaw}
          onChange={(e) => setEmailsRaw(e.target.value)}
          placeholder={"이메일을 줄바꿈 또는 쉼표로 구분해 입력하세요\nj.park@example.com, seal@example.com"}
        />
        <Dropdown
          options={ROLE_OPTIONS.map((r) => ({ value: r, label: getTenantRoleLabel(r) }))}
          value={role}
          onChange={(v) => setRole(v as TenantRole)}
        />
        <p className={css.helper}>초대 링크는 7일간 유효하며, 같은 역할로 일괄 초대됩니다.</p>
        {result ? (
          <p className={css.resultText}>
            {result.sent}건 발송 완료
            {result.skipped.length > 0
              ? ` · 건너뜀(이미 멤버/초대됨): ${result.skipped.join(", ")}`
              : ""}
          </p>
        ) : null}
        {isFailed ? (
          <p className={css.errorText}>초대 발송에 실패했습니다. 권한을 확인해주세요.</p>
        ) : null}
      </div>
    </Modal>
  );
}
