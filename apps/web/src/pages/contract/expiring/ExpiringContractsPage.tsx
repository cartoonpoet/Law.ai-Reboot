import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Spinner } from "@lawkit/ui";
import type { ContractSummary } from "@lawai/contracts";
import { TerminateContractModal } from "../sections/TerminateContractModal";
import { cx } from "../cx";
import { EXPIRING_PAGE_SIZE, EXPIRING_TABS, useExpiringContracts, type ExpiringTabTypes } from "./useExpiringContracts";
import { useRenewalTerms } from "./useRenewalTerms";
import { useExpireContract } from "./useExpireContract";
import { ExpiringContractRow } from "./ExpiringContractRow";
import { ExpireContractModal } from "./ExpireContractModal";
import * as css from "./expiringContracts.css";

const EMPTY_TEXT: Record<ExpiringTabTypes, string> = {
  d7: "7일 안에 만료되는 계약이 없어요.",
  d30: "30일 안에 만료되는 계약이 없어요.",
  d90: "90일 안에 만료되는 계약이 없어요.",
  expired: "기간이 지났는데 아직 끝나지 않은 계약이 없어요.",
};

/** 만료 관리 — 체결 완료·계약 이행 중인 계약을 만료가 가까운 순으로 보고 갱신·만료 종료·해지를 정한다. */
export function ExpiringContractsPage() {
  const navigate = useNavigate();
  const { tab, setTab, contracts, total, isLoading, counts } = useExpiringContracts();
  const { states, read, sendingId } = useRenewalTerms(contracts.map((contract) => contract.id));
  const { expire, isPending: isExpiring } = useExpireContract();
  const [expireTarget, setExpireTarget] = useState<ContractSummary | null>(null);
  const [terminateTargetId, setTerminateTargetId] = useState<string | null>(null);
  const now = new Date();

  const goToDerivedRequest = (contractId: string, stage: "renew" | "terminate") =>
    navigate(`/contract/request?origin=${contractId}&stage=${stage}`);

  return (
    <div className={css.page}>
      <header className={css.head}>
        <h1 className={css.title}>만료 관리</h1>
        <p className={css.desc}>
          체결 완료·계약 이행 중인 계약을 만료가 가까운 순으로 모았어요. 갱신 요청·만료로 종료·중도 해지를 여기서 바로 정해요.
        </p>
      </header>

      <div className={css.tabs} role="tablist" aria-label="만료 기간">
        {EXPIRING_TABS.map((option) => (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={tab === option.value}
            className={cx(css.tab, tab === option.value && css.tabActive)}
            onClick={() => setTab(option.value)}
          >
            {option.label}
            {counts[option.value] !== null ? ` ${counts[option.value]}` : ""}
          </button>
        ))}
      </div>

      <section className={css.card}>
        {isLoading && <Spinner label="불러오는 중..." />}
        {!isLoading && contracts.length === 0 && <p className={css.empty}>{EMPTY_TEXT[tab]}</p>}
        {!isLoading && contracts.length > 0 && (
          <div className={css.tableWrap}>
            <table className={css.table}>
              <thead>
                <tr>
                  <th className={css.th}>만료</th>
                  <th className={css.th}>계약</th>
                  <th className={css.th}>상대방</th>
                  <th className={css.th}>단계</th>
                  <th className={css.th}>AI 판단</th>
                  <th className={css.th}>결정</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((contract) => (
                  <ExpiringContractRow
                    key={contract.id}
                    contract={contract}
                    now={now}
                    termsState={states[contract.id] ?? { status: "none" }}
                    isSendingRead={sendingId === contract.id}
                    onOpen={() => navigate(`/contract/${contract.id}`)}
                    onRead={() => read(contract.id)}
                    onRenew={() => goToDerivedRequest(contract.id, "renew")}
                    onExpire={contract.status === "fulfilling" ? () => setExpireTarget(contract) : null}
                    onTerminate={() => setTerminateTargetId(contract.id)}
                  />
                ))}
              </tbody>
            </table>
            {total > EXPIRING_PAGE_SIZE && (
              <p className={css.note}>
                만료가 가까운 {EXPIRING_PAGE_SIZE}건만 보여요(전체 {total}건). 나머지는 계약 조회의 만료 필터로 볼 수 있어요.
              </p>
            )}
          </div>
        )}
      </section>

      {expireTarget && (
        <ExpireContractModal
          contract={expireTarget}
          isPending={isExpiring}
          onConfirm={() => expire(expireTarget.id, () => setExpireTarget(null))}
          onClose={() => setExpireTarget(null)}
        />
      )}

      {terminateTargetId && (
        <TerminateContractModal
          contractId={terminateTargetId}
          onRequestReview={() => goToDerivedRequest(terminateTargetId, "terminate")}
          onClose={() => setTerminateTargetId(null)}
        />
      )}
    </div>
  );
}
