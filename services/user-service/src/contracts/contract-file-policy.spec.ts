import type { FileInput } from "@lawai/contracts";
import { getAdditiveOnlyViolation, getSignedFileViolation, isContractFileReplaced } from "./contract-file-policy";

const file = (over: Partial<FileInput>): FileInput => ({ role: "attach", name: "a", meta: "", sortOrder: 0, ...over }) as FileInput;

describe("isContractFileReplaced", () => {
  const current = [{ id: "f1", role: "contract" }, { id: "f2", role: "attach" }];
  it("계약서를 건드리지 않으면 false", () => {
    expect(isContractFileReplaced(current, [file({ id: "f1", role: "contract" }), file({ id: "f2" })])).toBe(false);
  });
  it("새 계약서 업로드·제거·승격은 true", () => {
    expect(isContractFileReplaced(current, [file({ id: "f1", role: "contract" }), file({ role: "contract" })])).toBe(true);
    expect(isContractFileReplaced(current, [file({ id: "f2" })])).toBe(true);
    expect(isContractFileReplaced(current, [file({ id: "f1", role: "contract" }), file({ id: "f2", role: "contract" })])).toBe(true);
  });
});

describe("getAdditiveOnlyViolation", () => {
  it("기존 파일을 하나라도 빼면 메시지, 전부 유지하면 null", () => {
    expect(getAdditiveOnlyViolation([{ id: "a" }, { id: "b" }], ["a"])).toBe(
      "이 상태에서는 파일을 추가할 수만 있고 제거할 수 없습니다",
    );
    expect(getAdditiveOnlyViolation([{ id: "a" }], ["a", "new"])).toBeNull();
    expect(getAdditiveOnlyViolation([], [])).toBeNull();
  });
});

describe("getSignedFileViolation", () => {
  const backed = [{ id: "s1", storageKey: "k" }];
  it("서명본이 없으면 null", () => {
    expect(getSignedFileViolation([], [])).toBeNull();
  });
  it("바이트 있는 서명본: 유지하면 null, 역할 강등은 역할 변경 불가, 빼면 제거 불가", () => {
    expect(getSignedFileViolation(backed, [file({ id: "s1", role: "signed" })])).toBeNull();
    expect(getSignedFileViolation(backed, [file({ id: "s1", role: "attach" })])).toBe("서명본 파일의 역할은 변경할 수 없습니다");
    expect(getSignedFileViolation(backed, [])).toBe("서명본 파일은 이 요청으로 제거할 수 없습니다");
  });
  it("id 없는 메타데이터 signed 항목은 유지로 세지 않는다", () => {
    expect(getSignedFileViolation(backed, [file({ role: "signed" })])).toBe("서명본 파일은 이 요청으로 제거할 수 없습니다");
  });
  it("레거시(바이트 없음)는 signed 항목이 하나라도 있으면 통과", () => {
    const legacy = [{ id: "s1", storageKey: null }];
    expect(getSignedFileViolation(legacy, [file({ role: "signed" })])).toBeNull();
    expect(getSignedFileViolation(legacy, [file({ role: "attach" })])).toBe("서명본 파일은 이 요청으로 제거할 수 없습니다");
  });
});
