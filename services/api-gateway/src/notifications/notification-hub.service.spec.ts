import { type MessageEvent } from "@nestjs/common";
import { type Subscription, take, toArray } from "rxjs";
import { NotificationHubService } from "./notification-hub.service";

/**
 * NotificationHubService 단위 테스트(인메모리 SSE 허브).
 *
 * - subscribe: Observable 반환·구독 시 내부 레지스트리에 Subject 등록.
 * - push: 해당 userId 의 모든 Subject 에 next, 연결 없으면 no-op.
 * - 메모리 정리: 구독 해제(finalize) 시 Set 에서 제거, 빈 Set 은 Map 키 삭제
 *   (같은 userId 다중 탭 — 하나 닫혀도 나머지 유지, 다 닫히면 키 삭제).
 */
describe("NotificationHubService", () => {
  let hub: NotificationHubService;

  // 내부 레지스트리(private streams) 를 메모리 누수 검증용으로 들여다본다.
  const getStreams = () =>
    (hub as unknown as { streams: Map<string, Set<unknown>> }).streams;

  beforeEach(() => {
    hub = new NotificationHubService();
  });

  it("subscribe 는 Observable 을 반환하고 구독 시 레지스트리에 등록한다", () => {
    const stream$ = hub.subscribe("u-1");
    expect(typeof stream$.subscribe).toBe("function");
    // 구독 전에는 등록 안 됨(Subject 는 만들어지나 Map 등록은 subscribe 호출 시점이 아닌
    // hub.subscribe 본문에서 즉시 일어남 — 본 구현은 즉시 등록).
    expect(getStreams().get("u-1")?.size).toBe(1);

    const sub = stream$.subscribe();
    expect(getStreams().get("u-1")?.size).toBe(1);
    sub.unsubscribe();
  });

  it("push 는 해당 userId 의 구독자에게 data 를 전달한다", async () => {
    const received: MessageEvent[] = [];
    const sub = hub.subscribe("u-1").subscribe((event) => received.push(event));

    const payload = { id: "n-1", type: "comment_mention" };
    hub.push("u-1", payload);

    expect(received).toHaveLength(1);
    expect(received[0]).toEqual({ data: payload });
    sub.unsubscribe();
  });

  it("같은 userId 의 다중 탭(다중 구독) 모두에게 push 가 전달된다", () => {
    const tabA: MessageEvent[] = [];
    const tabB: MessageEvent[] = [];
    const subA = hub.subscribe("u-1").subscribe((e) => tabA.push(e));
    const subB = hub.subscribe("u-1").subscribe((e) => tabB.push(e));

    expect(getStreams().get("u-1")?.size).toBe(2);

    hub.push("u-1", { id: "n-1" });

    expect(tabA).toHaveLength(1);
    expect(tabB).toHaveLength(1);
    expect(tabA[0]).toEqual({ data: { id: "n-1" } });
    expect(tabB[0]).toEqual({ data: { id: "n-1" } });

    subA.unsubscribe();
    subB.unsubscribe();
  });

  it("연결이 없는 userId 로 push 하면 no-op(예외 없음)", () => {
    expect(() => hub.push("ghost", { id: "n-1" })).not.toThrow();
    expect(getStreams().has("ghost")).toBe(false);
  });

  it("다른 userId 의 구독자에게는 push 가 전달되지 않는다", () => {
    const other: MessageEvent[] = [];
    const sub = hub.subscribe("u-2").subscribe((e) => other.push(e));

    hub.push("u-1", { id: "n-1" });

    expect(other).toHaveLength(0);
    sub.unsubscribe();
  });

  it("구독 해제(finalize) 시 Set 에서 제거되고, 마지막 구독이면 Map 키가 삭제된다", () => {
    const sub: Subscription = hub.subscribe("u-1").subscribe();
    expect(getStreams().get("u-1")?.size).toBe(1);

    sub.unsubscribe();

    // 마지막 연결이 끊기면 Map 키 자체가 사라진다(메모리 누수 방지).
    expect(getStreams().has("u-1")).toBe(false);
  });

  it("다중 탭 중 하나만 닫히면 나머지는 유지되고 Map 키는 남는다", () => {
    const subA = hub.subscribe("u-1").subscribe();
    const subB = hub.subscribe("u-1").subscribe();
    expect(getStreams().get("u-1")?.size).toBe(2);

    subA.unsubscribe();
    // 하나 닫혀도 나머지(B)는 유지.
    expect(getStreams().get("u-1")?.size).toBe(1);

    subB.unsubscribe();
    // 다 닫히면 키 삭제.
    expect(getStreams().has("u-1")).toBe(false);
  });

  it("rxjs take/toArray 로 수신 시퀀스를 검증한다", async () => {
    const collected = hub.subscribe("u-1").pipe(take(2), toArray()).toPromise();

    hub.push("u-1", { id: "n-1" });
    hub.push("u-1", { id: "n-2" });

    const events = await collected;
    expect(events).toEqual([
      { data: { id: "n-1" } },
      { data: { id: "n-2" } },
    ]);
    // take(2) 완료 → finalize 로 정리됨.
    expect(getStreams().has("u-1")).toBe(false);
  });
});
