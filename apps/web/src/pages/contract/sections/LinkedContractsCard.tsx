import { Link } from "react-router-dom";
import { Icon } from "@lawkit/ui";
import type { ContractDetail, LinkedContractView } from "../mock-data";
import * as cd from "../contractDetail.css";
import * as css from "./linkedContractsCard.css";

interface LinkedContractsCardProps {
  linked: ContractDetail["linkedContracts"];
}

interface LinkedContractRowProps {
  label: string;
  contract: LinkedContractView;
}

const LinkedContractRow = ({ label, contract }: LinkedContractRowProps) => (
  <Link to={`/contract/${contract.id}`} className={css.row}>
    <span className={css.label}>{label}</span>
    <span className={css.title}>{contract.title}</span>
    <span className={css.meta}>
      {contract.code} · {contract.status}
    </span>
  </Link>
);

/** 연결된 계약 — 이 계약의 원 계약과, 이 계약에서 나온 갱신·변경·해지 계약. */
export const LinkedContractsCard = ({ linked }: LinkedContractsCardProps) => (
  <section className={cd.card} aria-label="연결된 계약">
    <header className={cd.chead}>
      <Icon name="fileText" size="sm" className={cd.cheadIcon} />
      연결된 계약
    </header>
    <div className={cd.cbody}>
      <div className={css.list}>
        {linked.origin && <LinkedContractRow label="원 계약" contract={linked.origin} />}
        {linked.derived.map((contract) => (
          <LinkedContractRow key={contract.id} label={contract.stage} contract={contract} />
        ))}
      </div>
    </div>
  </section>
);
