import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { of, throwError } from "rxjs";
import { AUTH_PATTERNS, type JwtPayload } from "@lawai/contracts";
import { SseJwtGuard } from "./sse-jwt.guard";

/**
 * SseJwtGuard 단위 테스트.
 *
 * - 쿼리 token 누락/배열이면 401(연결 거부).
 * - VALIDATE 성공 시 payload 를 req.user 에 주입하고 true.
 * - VALIDATE 실패(RpcException 등) 시 401.
 */
describe("SseJwtGuard", () => {
  const sendMock = jest.fn();
  const authClient = { send: sendMock };
  let guard: SseJwtGuard;

  // ExecutionContext 목: query 만 가진 Request 를 반환.
  const makeContext = (query: Record<string, unknown>) => {
    const req: { query: Record<string, unknown>; user?: JwtPayload } = {
      query,
    };
    return {
      context: {
        switchToHttp: () => ({ getRequest: () => req }),
      } as unknown as ExecutionContext,
      req,
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new SseJwtGuard(authClient as never);
  });

  it("쿼리 token 이 없으면 401 을 던진다", async () => {
    const { context } = makeContext({});
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("token 이 빈 문자열이면 401 을 던진다", async () => {
    const { context } = makeContext({ token: "" });
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("token 이 배열(string 아님)이면 401 을 던진다", async () => {
    const { context } = makeContext({ token: ["a", "b"] });
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("VALIDATE 성공 시 payload 를 req.user 에 주입하고 true 를 반환한다", async () => {
    const payload: JwtPayload = {
      sub: "u-1",
      email: "u1@law.ai",
      isSystemAdmin: false,
    };
    sendMock.mockReturnValue(of(payload));

    const { context, req } = makeContext({ token: "valid-token" });
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(req.user).toEqual(payload);
    // VALIDATE 패턴 + { token } 으로 호출.
    expect(sendMock).toHaveBeenCalledWith(AUTH_PATTERNS.VALIDATE, {
      token: "valid-token",
    });
  });

  it("VALIDATE 가 에러를 내면 401 을 던진다(req.user 미주입)", async () => {
    sendMock.mockReturnValue(throwError(() => new Error("invalid")));

    const { context, req } = makeContext({ token: "bad-token" });
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(req.user).toBeUndefined();
  });
});
