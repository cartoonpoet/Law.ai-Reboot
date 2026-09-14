import type { ContractSummary } from "@lawai/contracts";
import { getStatusLabel } from "../contract/contractStatus";
import type { DeadlineItem } from "./dashboardTypes";
import { getDaysLeft } from "./getDaysLeft";

const WITHIN_DAYS = 14;
const MAX_ITEMS = 5;

/** 내가 담당·요청·작성한 진행 중 계약 중 2주 안에 검토기한이 오는(지난 것 포함) 계약, 가까운 순 5건. */
export const getUpcomingDeadlines = (contracts: ContractSummary[], viewerId: string, now: Date): DeadlineItem[] =>
  contracts
    .filter((c) => c.ownerId === viewerId || c.requesterId === viewerId || c.createdById === viewerId)
    .flatMap((c): DeadlineItem[] => {
      const daysLeft = getDaysLeft(c.dueDate, now);
      if (c.dueDate === null || daysLeft === null || daysLeft > WITHIN_DAYS) return [];
      return [{ id: c.id, code: c.code, title: c.title, dueDate: c.dueDate, daysLeft, status: getStatusLabel(c.status), path: `/contract/${c.id}` }];
    })
    .toSorted((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, MAX_ITEMS);
