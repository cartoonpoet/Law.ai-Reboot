import { of } from "rxjs";
import { CONTRACT_PATTERNS } from "@lawai/contracts";
import { PublicStatsController } from "./public-stats.controller";

describe("PublicStatsController (gateway)", () => {
  it("user-service 에 공개 통계를 묻고 그대로 돌려준다", async () => {
    const send = jest.fn().mockReturnValue(of({ reviewedContractCount: 1284 }));
    const controller = new PublicStatsController({ send } as never);

    await expect(controller.stats()).resolves.toEqual({ reviewedContractCount: 1284 });
    expect(send).toHaveBeenCalledWith(CONTRACT_PATTERNS.PUBLIC_STATS, {});
  });
});
