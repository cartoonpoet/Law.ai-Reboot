import { Button } from "@lawkit/ui";
import type { ContractSummary } from "@lawai/contracts";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { getDaysLeft } from "../../dashboard/getDaysLeft";
import { getStatusLabel } from "../contractStatus";
import { cx } from "../cx";
import { formatExpiryDday, type RenewalTermsStateTypes } from "./renewalTerms";
import { RenewalTermsCell } from "./RenewalTermsCell";
import * as css from "./expiringContracts.css";

// 만료까지 이 날수 이하면 빨강, 이하면 주황.
const HOT_DAYS = 7;
const SOON_DAYS = 30;

const getDdayTone = (daysLeft: number | null): keyof typeof css.ddayTone => {
  if (daysLeft === null || daysLeft > SOON_DAYS) return "calm";
  return daysLeft <= HOT_DAYS ? "hot" : "soon";
};

interface ExpiringContractRowProps {
  contract: ContractSummary;
  now: Date;
  termsState: RenewalTermsStateTypes;
  isSendingRead: boolean;
  onOpen: () => void;
  onRead: () => void;
  onRenew: () => void;
  // 계약 이행 중일 때만 만료로 종료할 수 있다(체결 완료는 이행 시작 전이라 종료 전이가 없다).
  onExpire: (() => void) | null;
  onTerminate: () => void;
}

/** 만료 관리 표의 한 행 — D-day · 계약 · 상대방 · 단계 · AI 판단 · 결정. */
export const ExpiringContractRow = ({
  contract,
  now,
  termsState,
  isSendingRead,
  onOpen,
  onRead,
  onRenew,
  onExpire,
  onTerminate,
}: ExpiringContractRowProps) => {
  const daysLeft = getDaysLeft(contract.periodEnd, now);
  return (
    <tr>
      <td className={css.td}>
        <div className={css.stack}>
          <span className={cx(css.dday, css.ddayTone[getDdayTone(daysLeft)])}>{formatExpiryDday(daysLeft)}</span>
          <span className={css.sub}>{contract.periodEnd ? contract.periodEnd.slice(0, 10) : "-"}</span>
        </div>
      </td>
      <td className={css.td}>
        <div className={css.stack}>
          <button type="button" className={css.titleButton} onClick={onOpen}>
            {contract.title}
          </button>
          <span className={css.sub}>
            {contract.code} · 담당 {contract.ownerName ?? "미배정"}
          </span>
        </div>
      </td>
      <td className={css.td}>{contract.counterpartyName ?? "-"}</td>
      <td className={css.td}>
        <StatusBadge status={getStatusLabel(contract.status)} size="sm" />
      </td>
      <td className={css.td}>
        <RenewalTermsCell state={termsState} isSending={isSendingRead} now={now} onRead={onRead} />
      </td>
      <td className={css.td}>
        <div className={css.actions}>
          <Button type="button" size="small" onClick={onRenew}>
            갱신 요청
          </Button>
          {onExpire && (
            <Button type="button" size="small" variant="outline" color="secondary" onClick={onExpire}>
              만료로 종료
            </Button>
          )}
          <Button type="button" size="small" variant="outline" color="danger" onClick={onTerminate}>
            중도 해지
          </Button>
        </div>
      </td>
    </tr>
  );
};
