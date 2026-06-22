import { useState } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import { Card, Input, Button, ButtonGroup, RadioGroup, Radio, Dropdown, AutoComplete, InputDatePicker, InputDateRangePicker, Checkbox, Icon } from "@lawkit/ui";
import { LIST_FILTERS } from "../mock-data";
import type { ContractRequestForm } from "../request-schema";
import { toOptions } from "../contractOptions";
import { CardTitle, ErrText, Field } from "./_shared";
import { useDirectoryUsers } from "../hooks/useDirectoryUsers";
import { useContractCategories } from "../hooks/useContractCategories";
import { useCompanySearch } from "../hooks/useCompanySearch";
import { useCounterparties } from "../hooks/useCounterparties";
import { toCompanyOptions } from "../companyLabel";
import { CompanyCreateModal } from "./CompanyCreateModal";
import * as css from "../contractRequest.css";

const pickSingle = (v: string | string[]) => (Array.isArray(v) ? v[0] ?? "" : v);

const toISODate = (date: Date | null): string => (date ? date.toISOString().slice(0, 10) : "");
const isoToDate = (iso: string): Date | null => (iso ? new Date(iso) : null);

export function OverviewSection() {
  const { control, setValue, formState: { errors } } = useFormContext<ContractRequestForm>();
  const userOptions = useDirectoryUsers();
  const periodStart = useWatch({ control, name: "periodStart" });
  const periodEnd = useWatch({ control, name: "periodEnd" });
  const periodManual = useWatch({ control, name: "periodManual" });
  const noEndDate = useWatch({ control, name: "noEndDate" });
  const categoryId = useWatch({ control, name: "categoryId" });
  const { getChildOptions, getPathIds, isLeaf } = useContractCategories();
  const { query, results, search } = useCompanySearch();
  const { selected, add, selectByIds } = useCounterparties();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 대/중 cascade 선택. 사용자가 명시적으로 고른 값(override)을 우선하고,
  // 아직 안 골랐으면 저장된 categoryId 의 조상 경로에서 파생한다(수정 화면 복원).
  // 둘 다 렌더 중 파생이라 카테고리가 비동기로 늦게 도착해도 자동 복원된다(useEffect 미사용).
  const [majorOverride, setMajorOverride] = useState<string | null>(null);
  const [minorOverride, setMinorOverride] = useState<string | null>(null);
  const restoredPath = getPathIds(categoryId);
  const selectedMajor = majorOverride ?? restoredPath[0] ?? "";
  const selectedMinor = minorOverride ?? restoredPath[1] ?? "";

  const majorOptions = getChildOptions(null);
  const minorOptions = selectedMajor ? getChildOptions(selectedMajor) : [];
  const subOptions = selectedMinor ? getChildOptions(selectedMinor) : [];

  // 잎(자식 없음) 노드면 그 노드 자체가 최종 categoryId. 둘 다 비우면 categoryId 도 빈 값.
  const commitLeaf = (nodeId: string) =>
    setValue("categoryId", nodeId && isLeaf(nodeId) ? nodeId : "", { shouldValidate: true });

  return (
    <Card bordered header={<CardTitle num={1}>계약 개요</CardTitle>}>
      <div className={css.grid2}>
        <Field label="계약 단계" required>
          <Controller name="stage" control={control} render={({ field }) => (
            <RadioGroup value={field.value} onChange={field.onChange}>
              <Radio value="new" label="신규계약" />
              <Radio value="change" label="변경·해지" />
            </RadioGroup>
          )} />
        </Field>

        <Field label="보안여부" info="문서 접근 권한 등급입니다. 극비·보안·일반 중 선택하세요.">
          <Controller name="secure" control={control} render={({ field }) => (
            <ButtonGroup value={field.value} onChange={field.onChange} variant="outline"
              items={[
                { value: "top", label: "극비", icon: <Icon name="lock" size="sm" /> },
                { value: "secure", label: "보안", icon: <Icon name="shield" size="sm" /> },
                { value: "normal", label: "일반" },
              ]} />
          )} />
        </Field>

        <Field label="계약명" info="검토 목록과 결재선에서 식별되는 제목입니다." required className={css.full}>
          <Controller name="name" control={control} render={({ field }) => (
            <Input placeholder="계약명을 입력하세요" value={field.value} onChange={field.onChange} />
          )} />
          <ErrText msg={errors.name?.message} />
        </Field>

        <Field label="검토 요청자" info="검토를 요청하는 담당자입니다. 기본값은 로그인 사용자입니다." required>
          <Controller name="requester" control={control} render={({ field }) => (
            <AutoComplete options={userOptions} value={field.value} placeholder="검토 요청자 선택"
              onChange={(v) => field.onChange(pickSingle(v))} />
          )} />
          <ErrText msg={errors.requester?.message} />
        </Field>

        <Field label="계약서 유형" required>
          <Controller name="ctype" control={control} render={({ field }) => (
            <RadioGroup value={field.value} onChange={field.onChange}>
              <Radio value="normal" label="일반 검토요청" />
              <Radio value="std" label="표준계약서 계약체결" />
            </RadioGroup>
          )} />
        </Field>

        <Field label="계약 분류" required className={css.full}>
          <div className={css.grid3}>
            <Controller name="party" control={control} render={({ field }) => (
              <Dropdown options={toOptions(LIST_FILTERS.party.slice(1))} value={field.value} placeholder="계약 당사자"
                onChange={(v) => field.onChange(pickSingle(v))} />
            )} />
            <Dropdown options={majorOptions} value={selectedMajor} placeholder="계약 대분류"
              onChange={(v) => {
                const next = pickSingle(v);
                setMajorOverride(next);
                setMinorOverride("");
                commitLeaf(next);
              }} />
            <Dropdown options={minorOptions} value={selectedMinor} placeholder="계약 중분류"
              onChange={(v) => {
                const next = pickSingle(v);
                setMinorOverride(next);
                commitLeaf(next);
              }} />
            <Dropdown options={subOptions} value={categoryId} placeholder="계약 소분류"
              onChange={(v) => setValue("categoryId", pickSingle(v), { shouldValidate: true })} />
          </div>
          <ErrText msg={errors.party?.message ?? errors.categoryId?.message} />
        </Field>

        <Field label="계약 기간" className={css.full}>
          {periodManual ? (
            <Controller name="periodText" control={control} render={({ field }) => (
              <Input placeholder="예: 계약 체결일로부터 1년" value={field.value} onChange={field.onChange} />
            )} />
          ) : noEndDate ? (
            <InputDatePicker
              value={isoToDate(periodStart)}
              placeholder="YYYY-MM-DD"
              onChange={(date) => setValue("periodStart", toISODate(date))}
            />
          ) : (
            <InputDateRangePicker
              startDate={isoToDate(periodStart)}
              endDate={isoToDate(periodEnd)}
              placeholder="YYYY-MM-DD ~ YYYY-MM-DD"
              onChange={(range) => {
                setValue("periodStart", toISODate(range.start));
                setValue("periodEnd", toISODate(range.end));
              }}
            />
          )}
          <div style={{ display: "flex", gap: 18, marginTop: 9 }}>
            <Controller name="periodManual" control={control} render={({ field }) => (
              <Checkbox label="직접 입력" checked={field.value} onCheckedChange={(checked) => {
                field.onChange(checked);
                if (checked) setValue("noEndDate", false);
              }} />
            )} />
            <Controller name="noEndDate" control={control} render={({ field }) => (
              <Checkbox label="계약 종료일 없음" checked={field.value} onCheckedChange={(checked) => {
                field.onChange(checked);
                if (checked) {
                  setValue("periodManual", false);
                  setValue("periodEnd", "");
                }
              }} />
            )} />
          </div>
        </Field>

        <Field label="상대 계약자 정보" info="검색해 선택하거나, 목록에 없으면 신규 등록하세요. 여러 곳 선택 가능합니다." required className={css.full}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <div style={{ flex: 1, maxWidth: 460 }}>
              <AutoComplete
                multiple
                placeholder="회사명·사업자번호·대표자로 검색"
                options={toCompanyOptions(selected, results)}
                value={selected.map((c) => c.id)}
                onInputChange={search}
                onChange={(value) =>
                  selectByIds(Array.isArray(value) ? value : [value], results)
                }
                noResultText="검색 결과가 없습니다. 아래에서 신규 등록하세요."
              />
            </div>
            <Button type="button" variant="outline" color="secondary" iconLeft={<Icon name="plus" size="sm" />} onClick={() => setIsModalOpen(true)}>
              신규 추가
            </Button>
          </div>
          <ErrText msg={errors.counterparties?.message} />
          {isModalOpen && (
            <CompanyCreateModal
              initialName={query}
              onClose={() => setIsModalOpen(false)}
              onCreated={add}
            />
          )}
        </Field>
      </div>
    </Card>
  );
}
