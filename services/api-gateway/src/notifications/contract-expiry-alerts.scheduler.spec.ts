import { of, throwError } from "rxjs";
import { NOTIFICATION_PATTERNS } from "@lawai/contracts";
import { ContractExpiryAlertsScheduler } from "./contract-expiry-alerts.scheduler";

describe("ContractExpiryAlertsScheduler", () => {
  const send = jest.fn();
  const push = jest.fn();
  const scheduler = new ContractExpiryAlertsScheduler({ send } as never, { push } as never);

  beforeEach(() => jest.clearAllMocks());

  it("user-service 에 만료 임박 알림을 만들게 하고, 받은 알림을 받는 사람에게 실시간으로 민다", async () => {
    const first = { id: "n-1", type: "contract_expiring_30" };
    const second = { id: "n-2", type: "contract_expiring_7" };
    send.mockReturnValue(
      of({ notifications: [{ recipientId: "u1", notification: first }, { recipientId: "u2", notification: second }] }),
    );

    await scheduler.run();

    expect(send).toHaveBeenCalledWith(NOTIFICATION_PATTERNS.RUN_CONTRACT_EXPIRY_ALERTS, {});
    expect(push).toHaveBeenCalledWith("u1", first);
    expect(push).toHaveBeenCalledWith("u2", second);
  });

  it("user-service 가 실패해도 예외를 던지지 않는다", async () => {
    send.mockReturnValue(throwError(() => new Error("연결 끊김")));
    await expect(scheduler.run()).resolves.toBeUndefined();
    expect(push).not.toHaveBeenCalled();
  });
});
