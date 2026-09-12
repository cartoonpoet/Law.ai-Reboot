import { useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { Button } from "@lawkit/ui";
import type { ContractRequestForm } from "../request-schema";
import { RelatedDocsModal } from "./RelatedDocsModal";
import * as css from "../contractRequest.css";

/**
 * `relatedDocs` 폼 필드의 "찾아보기" 버튼 + 선택 건수 + 모달 UI.
 * OverviewSection(변경·해지 계약의 "원 계약")과 PeopleSection("관련문서")이
 * 같은 폼 필드를 다른 라벨로 노출할 때 공용으로 쓴다 — 두 곳에서 각자 복제하지 않는다.
 * 항상 둘 중 하나만 렌더되므로(같은 화면에서 동시 노출 없음) 내부 state 충돌은 없다.
 */
export function RelatedDocsPicker() {
  const { control } = useFormContext<ContractRequestForm>();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Controller name="relatedDocs" control={control} render={({ field }) => (
      <div className={css.browseRow}>
        <Button type="button" variant="outline" color="secondary" size="small" onClick={() => setIsOpen(true)}>
          찾아보기
        </Button>
        {field.value.length > 0 && <span className={css.browseCount}>{field.value.length}건 선택</span>}
        {isOpen && (
          <RelatedDocsModal
            selected={field.value}
            onClose={() => setIsOpen(false)}
            onConfirm={(docs) => { field.onChange(docs); setIsOpen(false); }}
          />
        )}
      </div>
    )} />
  );
}
