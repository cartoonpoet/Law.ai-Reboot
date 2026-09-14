import type { AssistantAction, AssistantChatResponse } from "@lawai/contracts";
import type { AssistantContext } from "./assistant-context";

const MAX_ACTIONS = 3;
const MAX_LABEL_LENGTH = 30;
const FIXED_OPEN_PATHS = ["/", "/approvals/inbox", "/contract/list"];
const UNREADABLE_REPLY = "답을 제대로 만들지 못했어요. 조금 다르게 다시 물어봐 주세요.";

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

const parseJson = (content: string): unknown => {
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
};

// 모델이 제안한 행동 하나를 실제 데이터·권한으로 검증해 확정한다. 근거가 없으면 버린다.
const toVerifiedAction = (raw: unknown, context: AssistantContext): AssistantAction | null => {
  if (!isRecord(raw)) return null;
  const contract = typeof raw.contractId === "string" ? context.contracts.find((c) => c.id === raw.contractId) : undefined;

  if (raw.type === "open" && typeof raw.path === "string") {
    const contractMatch = /^\/contract\/([^/]+)$/.exec(raw.path);
    const isKnownPath = FIXED_OPEN_PATHS.includes(raw.path) || (contractMatch !== null && context.contracts.some((c) => c.id === contractMatch[1]));
    if (!isKnownPath) return null;
    const label = typeof raw.label === "string" && raw.label.trim() ? raw.label.trim().slice(0, MAX_LABEL_LENGTH) : "열기";
    return { type: "open", label, path: raw.path };
  }

  if (raw.type === "assign" && typeof raw.ownerId === "string") {
    const owner = context.assignees.find((a) => a.id === raw.ownerId);
    if (!context.viewer.canAssign || !contract || contract.status !== "unassigned" || !owner) return null;
    return { type: "assign", contractId: contract.id, contractTitle: contract.title, ownerId: owner.id, ownerName: owner.name };
  }

  if (raw.type === "startReview") {
    if (!contract || contract.status !== "assigning" || contract.ownerId !== context.viewer.id) return null;
    return { type: "startReview", contractId: contract.id, contractTitle: contract.title };
  }

  return null;
};

const getActionKey = (action: AssistantAction) =>
  action.type === "open" ? `open:${action.path}` : `${action.type}:${action.contractId}`;

/** 모델 응답(JSON 문자열) → 비서 응답. 형식이 틀리면 안내 문구, 행동은 검증된 것만 최대 3개. */
export const parseAssistantReply = (content: string, context: AssistantContext): AssistantChatResponse => {
  const parsed = parseJson(content);
  if (!isRecord(parsed) || typeof parsed.reply !== "string" || !parsed.reply.trim()) {
    return { reply: UNREADABLE_REPLY, actions: [], needsSetup: false };
  }

  const rawActions = Array.isArray(parsed.actions) ? parsed.actions : [];
  const actions = rawActions
    .map((raw) => toVerifiedAction(raw, context))
    .filter((action): action is AssistantAction => action !== null)
    .filter((action, i, list) => list.findIndex((other) => getActionKey(other) === getActionKey(action)) === i)
    .slice(0, MAX_ACTIONS);

  return { reply: parsed.reply.trim(), actions, needsSetup: false };
};
