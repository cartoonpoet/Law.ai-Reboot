import { useState } from "react";
import { Button, ButtonGroup } from "@lawkit/ui";
import { LitigationMockHead } from "./LitigationMockHead";
import { HearingCalendar } from "./HearingCalendar";
import { HearingList } from "./HearingList";
import * as css from "./litigationMock.css";

const VIEWS = [
  { value: "calendar", label: "달력" },
  { value: "list", label: "목록" },
];

/** 기일 — 달력과 목록을 한 화면에서 토글로 바꿔 본다. */
export const HearingScheduleMock = () => {
  const [view, setView] = useState("calendar");

  return (
    <div>
      <LitigationMockHead
        variant="기일 — 달력 · 목록 한 화면"
        description="같은 기일을 달력과 목록 두 가지로 봅니다. 달력에서 일정을 누르면 사건 정보가 뜨고, 목록은 날짜순으로 쌓여 남은 일수와 참석자를 한눈에 봅니다."
        eyebrow="송무"
        title="기일"
      >
        <Button>기일 등록</Button>
      </LitigationMockHead>

      <div className={css.filters}>
        <ButtonGroup variant="segmented" items={VIEWS} value={view} onChange={(next) => setView(String(next))} />
      </div>

      {view === "calendar" ? <HearingCalendar /> : <HearingList />}
    </div>
  );
};
