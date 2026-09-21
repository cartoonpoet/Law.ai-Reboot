import { $Enums } from "@prisma/client";
import { APPROVER_TYPES, CONTRACT_STATUSES, REVIEW_TYPES, SECURITY_LEVELS } from "@lawai/contracts";

// Prisma enum 과 @lawai/contracts 공유 상수의 값 집합이 어긋나면(한쪽만 값 추가/삭제) 실패한다.
const sorted = (values: readonly string[]) => [...values].sort();

describe("Prisma enum ↔ @lawai/contracts 값 집합 일치", () => {
  it("ContractStatus", () => {
    expect(sorted(Object.values($Enums.ContractStatus))).toEqual(sorted(CONTRACT_STATUSES));
  });
  it("SecurityLevel", () => {
    expect(sorted(Object.values($Enums.SecurityLevel))).toEqual(sorted(SECURITY_LEVELS));
  });
  it("ReviewType", () => {
    expect(sorted(Object.values($Enums.ReviewType))).toEqual(sorted(REVIEW_TYPES));
  });
  it("ApproverType", () => {
    expect(sorted(Object.values($Enums.ApproverType))).toEqual(sorted(APPROVER_TYPES));
  });
});
