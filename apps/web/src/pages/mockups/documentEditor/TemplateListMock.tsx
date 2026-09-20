import { useState } from "react";
import {
  Button,
  ButtonGroup,
  DataTable,
  EmptyState,
  Icon,
  Input,
  Pagination,
  PaginationCount,
} from "@lawkit/ui";
import { Panel } from "../../../components/ui/Panel";
import { STANDARD_FORM_CATEGORIES } from "../../../api/standardForms";
import { DocMockHead } from "./DocMockHead";
import { NavPlacementNote } from "./NavPlacementNote";
import { TEMPLATE_COLUMNS } from "./templateColumns";
import { MOCK_TEMPLATES } from "./documentEditorMockData";
import * as listCss from "../../contract/contractList.css";
import * as css from "./documentEditorMock.css";

/**
 * 1. 표준양식 관리 — 목록.
 * 계약 조회와 같은 리듬(페이지 머리 + 검색 + 분류 탭 + 표)으로, 회사가 쓰는 표준 양식을 한 화면에서 본다.
 */
export const TemplateListMock = () => {
  const [categoryId, setCategoryId] = useState("all");
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);

  const word = keyword.trim();

  const matchKeyword = (name: string): boolean => (word ? name.includes(word) : true);

  const rows = MOCK_TEMPLATES.filter(
    (item) => (categoryId === "all" || item.categoryId === categoryId) && matchKeyword(item.name),
  );

  const countByCategory = (id: string): number =>
    MOCK_TEMPLATES.filter((item) => item.categoryId === id && matchKeyword(item.name)).length;

  const tabs = [
    { value: "all", label: `전체 ${MOCK_TEMPLATES.filter((item) => matchKeyword(item.name)).length}` },
    ...STANDARD_FORM_CATEGORIES.map((item) => ({
      value: item.id,
      label: `${item.label} ${countByCategory(item.id)}`,
    })),
  ];

  return (
    <div>
      <DocMockHead
        variant="1. 표준양식 관리 — 목록"
        description="회사가 쓰는 표준 계약서 양식을 분류별로 모아 봅니다. 이름을 누르면 문서 편집기로 들어가고, 새 양식은 빈 문서로 시작하거나 가지고 있는 워드 파일을 올려서 만듭니다."
        eyebrow="계약 관리"
        title="표준양식 관리"
      >
        <Button variant="outline" color="secondary" iconLeft={<Icon name="uploadCloud" size="sm" />}>
          워드 파일 올려서 만들기
        </Button>
        <Button iconLeft={<Icon name="plus" size="sm" />}>빈 문서로 만들기</Button>
      </DocMockHead>

      <NavPlacementNote />

      <div className={css.filters}>
        <div className={css.search}>
          <Input
            inputSize="medium"
            placeholder="양식 이름으로 찾기"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            leftIcon={<Icon name="search" size="sm" className={css.searchIcon} />}
          />
        </div>
      </div>

      <Panel flush>
        <div className={listCss.groupBar}>
          <ButtonGroup
            variant="segmented"
            items={tabs}
            value={categoryId}
            onChange={(next) => setCategoryId(String(next))}
          />
          <div className={listCss.groupBarSpacer} />
          <span className={listCss.totalCount}>
            총 <b className={listCss.totalCountValue}>{rows.length}</b>개
          </span>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon={<Icon name="fileText" size="lg" />}
            title="이 분류에는 아직 양식이 없어요"
            description="빈 문서로 새로 쓰거나, 쓰던 워드 파일을 올려 표준 양식으로 만들 수 있어요."
            action={<Button iconLeft={<Icon name="plus" size="sm" />}>빈 문서로 만들기</Button>}
          />
        ) : (
          <>
            <div className={listCss.tableWrap}>
              <DataTable data={rows} columns={TEMPLATE_COLUMNS} getRowId={(item) => item.id} />
            </div>

            <div className={css.pager}>
              <PaginationCount totalCount={rows.length} />
              <Pagination page={page} totalPages={1} onPageChange={setPage} />
            </div>
          </>
        )}
      </Panel>
    </div>
  );
};
