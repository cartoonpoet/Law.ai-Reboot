import { Avatar, EmptyState, HStack, Icon, Input, ListGroup, ListGroupItem, Spinner, VStack } from "@lawkit/ui";
import type { TemplateSummaryDto } from "@lawai/contracts";
import { LoadFailed } from "./LoadFailed";
import * as css from "./standardFormsModal.css";

interface StandardFormListProps {
  results: TemplateSummaryDto[];
  selectedId?: string;
  /** 입력창에 보이는 값 */
  keyword: string;
  /** 실제로 조회에 쓴 값 — 빈 상태 문구를 "검색 결과 없음"으로 바꿀지 판단한다 */
  searchedKeyword: string;
  isFetching: boolean;
  isError: boolean;
  onSearch: (text: string) => void;
  onSelect: (id: string) => void;
  onRetry: () => void;
}

/** 표준양식 목록 칸 — 검색 + 목록. 불러오는 중·없음·실패를 모두 그린다. */
export const StandardFormList = ({
  results,
  selectedId,
  keyword,
  searchedKeyword,
  isFetching,
  isError,
  onSearch,
  onSelect,
  onRetry,
}: StandardFormListProps) => (
  <div className={css.colMid}>
    <div className={css.searchBar}>
      <Input
        aria-label="양식명 검색"
        placeholder="양식명으로 검색"
        value={keyword}
        rightIcon={<Icon name="search" size="sm" />}
        onChange={(e) => onSearch(e.target.value)}
      />
    </div>
    <div className={css.colList}>
      {isError ? (
        <div className={css.listState}>
          <LoadFailed onRetry={onRetry} />
        </div>
      ) : isFetching ? (
        <div className={css.listState}>
          <Spinner size="lg" label="양식을 불러오는 중…" />
        </div>
      ) : results.length === 0 ? (
        <div className={css.listState}>
          <EmptyState
            icon={<Icon name="fileText" size="lg" />}
            title={searchedKeyword ? "찾는 양식이 없어요" : "이 분류에는 아직 양식이 없어요"}
            description={
              searchedKeyword
                ? "다른 이름으로 찾아보거나, 왼쪽에서 다른 분류를 골라 보세요."
                : "왼쪽에서 다른 분류를 골라 보세요. 표준양식은 문서관리에서 만들 수 있어요."
            }
          />
        </div>
      ) : (
        <ListGroup variant="flush">
          {results.map((form) => (
            // 고른 줄은 aria-current 로 알린다 — ListGroupItem 의 active 는 파란 배경이라
            // 줄 안의 양식명·메타 글자색과 부딪힌다(분류 칸에서만 쓴다).
            <ListGroupItem
              key={form.id}
              aria-current={selectedId === form.id ? "true" : undefined}
              onClick={() => onSelect(form.id)}
              leading={<Avatar size="md" system icon={<Icon name="file" size="sm" />} />}
              trailing={
                selectedId === form.id ? (
                  <span className={css.checkMark}>
                    <Icon name="check" size="sm" />
                  </span>
                ) : undefined
              }
            >
              <VStack gap="x1">
                <HStack gap="x2" align="center">
                  <span className={css.docName}>{form.name}</span>
                  <span className={css.ver}>v{form.currentVersionNo}</span>
                </HStack>
                <span className={css.tplMeta}>
                  {form.createdByName ?? "—"} 작성 · 개정 {form.updatedAt.slice(0, 10)}
                </span>
              </VStack>
            </ListGroupItem>
          ))}
        </ListGroup>
      )}
    </div>
  </div>
);
