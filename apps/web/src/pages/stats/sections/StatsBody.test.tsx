import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { StatsBody } from "./StatsBody";
import type { CycleTimeViewTypes } from "../hooks/useCycleTimeStats";

const createView = (over: Partial<CycleTimeViewTypes>): CycleTimeViewTypes =>
  ({
    canSee: true,
    isPermissionLoading: false,
    targetType: "contract",
    changeTargetType: () => {},
    preset: "6m",
    changePreset: () => {},
    range: { from: "2026-04-01", to: "2026-09-19" },
    ownerId: "",
    changeOwnerId: () => {},
    ownerOptions: [],
    stats: null,
    isFetching: false,
    isPermissionError: false,
    isError: false,
    retry: () => {},
    ...over,
  }) as CycleTimeViewTypes;

describe("StatsBody", () => {
  it("권한이 없으면 오류 대신 법무팀 전용 안내를 보여준다", () => {
    render(<StatsBody view={createView({ canSee: false })} />);
    expect(screen.getByText("업무 통계는 법무팀만 볼 수 있습니다")).toBeInTheDocument();
  });

  it("권한을 확인하는 동안에는 안내를 먼저 보여주지 않는다", () => {
    render(<StatsBody view={createView({ canSee: false, isPermissionLoading: true })} />);
    expect(screen.queryByText("업무 통계는 법무팀만 볼 수 있습니다")).not.toBeInTheDocument();
  });

  // 내 권한을 못 불러온 것을 "권한 없음"으로 단정하면 법무팀에게 엉뚱한 안내가 뜬다.
  it("권한을 못 불러오면 볼 수 없다고 단정하지 않는다", () => {
    render(<StatsBody view={createView({ canSee: false, isPermissionError: true })} />);
    expect(screen.getByText("권한을 확인하지 못했습니다")).toBeInTheDocument();
    expect(screen.queryByText("업무 통계는 법무팀만 볼 수 있습니다")).not.toBeInTheDocument();
  });

  it("통계를 못 불러오면 다시 시도할 수 있게 한다", () => {
    render(<StatsBody view={createView({ isError: true })} />);
    expect(screen.getByText("통계를 불러오지 못했습니다")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeInTheDocument();
  });

  // 필터를 바꾸다 한 번 실패했다고 보고 있던 숫자가 사라지면 안 된다.
  it("이전 숫자가 남아 있으면 실패해도 본문을 그대로 보여준다", () => {
    const stats = {
      targetType: "contract",
      from: "2026-04-01",
      to: "2026-09-19",
      total: { label: "접수 → 체결", targetDays: 10, avgDays: 16, medianDays: 16, doneCount: 3, openCount: 3 },
      stages: [],
      monthly: [],
      owners: [],
      overdue: [],
      recordedSince: null,
    } as unknown as NonNullable<CycleTimeViewTypes["stats"]>;

    // 본문은 지연 목록에서 상세로 보내므로 라우터가 필요하다.
    render(
      <MemoryRouter>
        <StatsBody view={createView({ isError: true, stats })} />
      </MemoryRouter>,
    );
    expect(screen.queryByText("통계를 불러오지 못했습니다")).not.toBeInTheDocument();
    expect(screen.getByText("접수 → 체결 소요시간")).toBeInTheDocument();
  });
});
