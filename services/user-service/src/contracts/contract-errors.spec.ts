import { RpcException } from "@nestjs/microservices";
import { Prisma } from "@prisma/client";
import { STALE_CONTRACT_MESSAGE, raiseStaleConflict } from "./contract-errors";

const known = (code: string) => new Prisma.PrismaClientKnownRequestError("x", { code, clientVersion: "test" });
const thrownBy = (fn: () => never): unknown => {
  try {
    fn();
  } catch (e) {
    return e;
  }
  throw new Error("던지지 않았다");
};

describe("raiseStaleConflict", () => {
  it("P2025 는 409 RpcException(기본 메시지)을 던진다", () => {
    const e = thrownBy(() => raiseStaleConflict(known("P2025")));
    expect(e).toBeInstanceOf(RpcException);
    expect((e as RpcException).getError()).toEqual({ status: 409, message: STALE_CONTRACT_MESSAGE });
  });
  it("메시지를 지정하면 그 메시지", () => {
    const e = thrownBy(() => raiseStaleConflict(known("P2025"), "다른"));
    expect((e as RpcException).getError()).toEqual({ status: 409, message: "다른" });
  });
  it("다른 코드·일반 오류는 원본 그대로 던진다", () => {
    const p2002 = known("P2002");
    const plain = new Error("boom");
    expect(thrownBy(() => raiseStaleConflict(p2002))).toBe(p2002);
    expect(thrownBy(() => raiseStaleConflict(plain))).toBe(plain);
  });
});
