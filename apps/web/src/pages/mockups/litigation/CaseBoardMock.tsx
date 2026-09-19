import { useState } from "react";
import { Button, Icon, Input, StatCell, StatGrid, Switch, Widget } from "@lawkit/ui";
import { LitigationMockHead } from "./LitigationMockHead";
import { CaseBoardCard } from "./CaseBoardCard";
import { MOCK_CASES } from "./litigationMockData";
import * as css from "./litigationMock.css";

const MY_NAME = "손준호";

/** B안 — 기일 중심 카드. 급한 사건이 위로 오고 무엇을 언제까지 해야 하는지 바로 보인다. */
export const CaseBoardMock = () => {
  const [isMine, setIsMine] = useState(false);
  const [keyword, setKeyword] = useState("");

  const word = keyword.trim();
  const visible = MOCK_CASES.filter((item) => {
    if (isMine && item.ownerName !== MY_NAME) return false;
    return word ? `${item.name}${item.caseNo}${item.opponent}`.includes(word) : true;
  });

  // 기일이 가까운 사건부터. 기일 없는 사건은 맨 뒤.
  const sorted = visible.toSorted((a, b) => {
    if (!a.nextHearing) return 1;
    if (!b.nextHearing) return -1;
    return a.nextHearing.date.localeCompare(b.nextHearing.date);
  });

  return (
    <div>
      <LitigationMockHead
        variant="B안 — 기일 중심 카드형"
        description="기일이 가까운 사건이 맨 위로 옵니다. 카드 하나에 다음 기일·낼 서면·심급 진행·로아이 한 줄까지 담아, 목록만 보고도 오늘 할 일을 알 수 있게 했습니다."
        eyebrow="송무"
        title="사건 조회"
      >
        <Button>사건 등록</Button>
      </LitigationMockHead>

      <div className={css.filters}>
        <div className={css.search}>
          <Input
            inputSize="medium"
            placeholder="사건명·사건번호·상대방 검색"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            leftIcon={<Icon name="search" size="sm" className={css.searchIcon} />}
          />
        </div>
        <Switch label="내 사건만" checked={isMine} onCheckedChange={setIsMine} />
      </div>

      <div className={css.boardStats}>
        <Widget title="이번 달 송무 현황">
          <StatGrid>
            <StatCell
              label="진행 중"
              value={MOCK_CASES.filter((item) => item.status === "진행").length}
              valueColor="primary"
            />
            <StatCell label="7일 내 기일" value={2} valueColor="warning" />
            <StatCell
              label="제출 기한 임박"
              value={MOCK_CASES.filter((item) => item.todo).length}
              valueColor="danger"
            />
            <StatCell
              label="종결"
              value={MOCK_CASES.filter((item) => item.status === "종결").length}
              valueColor="heading"
            />
          </StatGrid>
        </Widget>
      </div>

      <div className={css.boardList}>
        {sorted.map((item) => (
          <CaseBoardCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
};
