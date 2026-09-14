import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ASSISTANT_COMMANDS, ASSISTANT_FALLBACK } from "./assistantData";
import { useAssistantChat } from "./useAssistantChat";

describe("useAssistantChat", () => {
  it("인사말 하나로 시작하고 추천 명령을 모두 빠른 답장으로 준다", () => {
    const { result } = renderHook(() => useAssistantChat());
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.quickReplies).toEqual(ASSISTANT_COMMANDS.map((c) => c.prompt));
  });

  it("추천 명령을 보내면 준비된 답이 붙고, 보낸 명령은 빠른 답장에서 빠진다", () => {
    const { result } = renderHook(() => useAssistantChat());
    const command = ASSISTANT_COMMANDS[0];
    act(() => result.current.sendMessage(command.prompt));
    expect(result.current.messages.map((m) => m.text).slice(1)).toEqual([command.prompt, command.reply]);
    expect(result.current.quickReplies).not.toContain(command.prompt);
  });

  it("모르는 말에는 안내 답을 준다", () => {
    const { result } = renderHook(() => useAssistantChat());
    act(() => result.current.sendMessage("다음 주 일정 알려줘"));
    expect(result.current.messages.at(-1)?.text).toBe(ASSISTANT_FALLBACK);
  });
});
