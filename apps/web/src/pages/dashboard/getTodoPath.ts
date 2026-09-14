import type { TodoItem } from "./mock-data";

/** 할 일을 눌렀을 때 갈 화면. 자문·송무·인감·지식재산 상세 화면은 아직 없어 이동하지 않는다. */
export const getTodoPath = (todo: Pick<TodoItem, "id" | "type">): string | null => {
  if (todo.type === "계약") return `/contract/${todo.id}`;
  if (todo.type === "결재") return "/approvals/inbox";
  return null;
};
