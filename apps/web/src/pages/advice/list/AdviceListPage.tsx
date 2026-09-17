import { useNavigate } from "react-router-dom";
import {
  Button,
  ButtonGroup,
  ChipsNavigation,
  DataTable,
  Dropdown,
  Icon,
  Input,
  Pagination,
  PaginationCount,
  Switch,
} from "@lawkit/ui";
import type { AdviceStatusTypes } from "@lawai/contracts";
import { Eyebrow } from "../../../components/ui/Eyebrow";
import { Panel } from "../../../components/ui/Panel";
import { ADVICE_CATEGORIES, ADVICE_GROUPS, ADVICE_STATUS_LABEL, type AdviceGroupTypes } from "../adviceMeta";
import { useAdvicesList } from "../hooks/useAdvicesList";
import { createAdviceListColumns } from "./adviceListColumns";
import * as listCss from "../../contract/contractList.css";
import * as shared from "../adviceShared.css";
import * as css from "./adviceList.css";

const CATEGORY_OPTIONS = [
  { value: "", label: "자문분류 전체" },
  ...ADVICE_CATEGORIES.map((name) => ({ value: name, label: name })),
];

const pickSingle = (value: string | string[]): string => (Array.isArray(value) ? value[0] ?? "" : value);

/** 법률자문 조회 — 계약 조회와 같은 부품·배치. */
export const AdviceListPage = () => {
  const navigate = useNavigate();
  const list = useAdvicesList();
  const columns = createAdviceListColumns(new Date());

  const getGroupLabel = (value: AdviceGroupTypes, label: string) => {
    const count = list.getGroupCount(value);
    return count === null ? label : `${label} ${count}`;
  };

  return (
    <div>
      <div className={shared.pageHead}>
        <div className={shared.pageTitleGroup}>
          <Eyebrow>법무 업무</Eyebrow>
          <h1 className={shared.pageTitle}>법률자문</h1>
        </div>
        <div className={shared.pageActions}>
          <Button
            size="medium"
            iconLeft={<Icon name="law" size="sm" className={shared.buttonIcon} />}
            onClick={() => navigate("/advice/request")}
          >
            자문 요청
          </Button>
        </div>
      </div>

      <div className={css.filters}>
        <div className={listCss.filterSelect}>
          <Dropdown
            options={CATEGORY_OPTIONS}
            value={list.category}
            placeholder="자문분류"
            onChange={(value) => list.changeCategory(pickSingle(value))}
          />
        </div>
        <div className={css.search}>
          <Input
            inputSize="medium"
            placeholder="자문명·관리번호 검색"
            value={list.q}
            onChange={(event) => list.changeQ(event.target.value)}
            leftIcon={<Icon name="search" size="sm" className={css.searchIcon} />}
          />
        </div>
        <Switch label="내 업무만" checked={list.isMine} onCheckedChange={list.changeMine} />
      </div>

      <Panel flush>
        <div className={listCss.groupBar}>
          <ButtonGroup
            variant="segmented"
            items={ADVICE_GROUPS.map((group) => ({ value: group.value, label: getGroupLabel(group.value, group.label) }))}
            value={list.group}
            onChange={(value) => list.changeGroup(String(value) as AdviceGroupTypes)}
          />
          <div className={listCss.groupBarSpacer} />
          <span className={listCss.totalCount}>
            총 <b className={listCss.totalCountValue}>{list.total}</b>건
          </span>
        </div>

        {list.groupStatuses.length > 1 && (
          <div className={listCss.subbar}>
            <span className={listCss.subbarLabel}>세부 상태</span>
            <ChipsNavigation
              allLabel="전체"
              value={list.status}
              onChange={(value) => list.changeStatus(pickSingle(value) as AdviceStatusTypes | "")}
              items={list.groupStatuses.map((status) => ({ value: status, label: ADVICE_STATUS_LABEL[status] }))}
            />
          </div>
        )}

        <div className={listCss.tableWrap}>
          <DataTable
            data={list.advices}
            columns={columns}
            getRowId={(advice) => advice.id}
            onRowClick={(advice) => navigate(`/advice/${advice.id}`)}
            emptyText={list.isFetching ? "불러오는 중…" : "조회된 자문이 없습니다."}
          />
        </div>

        <div className={css.pager}>
          <PaginationCount totalCount={list.total} />
          <Pagination page={list.page} totalPages={list.totalPages} onPageChange={list.setPage} />
        </div>
      </Panel>
    </div>
  );
};
