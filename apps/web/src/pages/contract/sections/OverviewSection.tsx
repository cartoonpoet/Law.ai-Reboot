import { useState } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import { Card, Input, Button, ButtonGroup, RadioGroup, Radio, Dropdown, AutoComplete, InputDatePicker, InputDateRangePicker, Checkbox, Icon, themeVars } from "@lawkit/ui";
import { LIST_FILTERS } from "../mock-data";
import type { ContractRequestForm } from "../request-schema";
import { USER_OPTIONS, toOptions, getMajorOptions, getMinorOptions, getSubOptions } from "../contractOptions";
import type { Company } from "@lawai/contracts";
import { CardTitle, ErrText, Field } from "./_shared";
import { useCompanySearch } from "../hooks/useCompanySearch";
import { useCounterparties } from "../hooks/useCounterparties";
import { toCompanyOptions } from "../companyLabel";
import { CompanyCreateModal } from "./CompanyCreateModal";
import { CompanyOptionRow } from "./CompanyOptionRow";
import * as css from "../contractRequest.css";

const pickSingle = (v: string | string[]) => (Array.isArray(v) ? v[0] ?? "" : v);

const toISODate = (date: Date | null): string => (date ? date.toISOString().slice(0, 10) : "");
const isoToDate = (iso: string): Date | null => (iso ? new Date(iso) : null);

export function OverviewSection() {
  const { control, setValue, formState: { errors } } = useFormContext<ContractRequestForm>();
  const periodStart = useWatch({ control, name: "periodStart" });
  const periodEnd = useWatch({ control, name: "periodEnd" });
  const periodManual = useWatch({ control, name: "periodManual" });
  const noEndDate = useWatch({ control, name: "noEndDate" });
  const catMajor = useWatch({ control, name: "catMajor" });
  const catMinor = useWatch({ control, name: "catMinor" });
  const { query, results, search } = useCompanySearch();
  const { selected, add, selectByIds } = useCounterparties();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 옵션 value(id) → Company 조회용. 드롭다운 리치 행 렌더에 사용.
  const companyById = new Map<string, Company>(
    [...selected, ...results].map((c) => [c.id, c]),
  );

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
            <AutoComplete options={USER_OPTIONS} value={field.value} placeholder="검토 요청자 선택"
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
          <div className={css.grid4}>
            <Controller name="party" control={control} render={({ field }) => (
              <Dropdown options={toOptions(LIST_FILTERS.party.slice(1))} value={field.value} placeholder="계약 당사자"
                onChange={(v) => field.onChange(pickSingle(v))} />
            )} />
            <Controller name="catMajor" control={control} render={({ field }) => (
              <Dropdown options={getMajorOptions()} value={field.value} placeholder="계약 대분류"
                onChange={(v) => {
                  field.onChange(pickSingle(v));
                  setValue("catMinor", "");
                  setValue("catSub", "");
                }} />
            )} />
            <Controller name="catMinor" control={control} render={({ field }) => (
              <Dropdown options={getMinorOptions(catMajor)} value={field.value} placeholder="계약 중분류"
                onChange={(v) => {
                  field.onChange(pickSingle(v));
                  setValue("catSub", "");
                }} />
            )} />
            <Controller name="catSub" control={control} render={({ field }) => (
              <Dropdown options={getSubOptions(catMajor, catMinor)} value={field.value} placeholder="계약 소분류"
                onChange={(v) => field.onChange(pickSingle(v))} />
            )} />
          </div>
          <ErrText msg={errors.party?.message ?? errors.catMajor?.message ?? errors.catMinor?.message ?? errors.catSub?.message} />
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
                showSelectedInList
                placeholder="회사명·사업자번호·대표자로 검색"
                options={toCompanyOptions(selected, results)}
                value={selected.map((c) => c.id)}
                onInputChange={search}
                onChange={(value) =>
                  selectByIds(Array.isArray(value) ? value : [value], results)
                }
                renderOption={(opt, { selected: isSel }) => {
                  const company = companyById.get(opt.value);
                  return company ? (
                    <CompanyOptionRow company={company} selected={isSel} />
                  ) : (
                    opt.label
                  );
                }}
                noResultText="검색 결과가 없습니다. 아래에서 신규 등록하세요."
                footer={
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      width: "100%",
                      padding: "11px 12px",
                      border: "none",
                      background: "none",
                      cursor: "pointer",
                      fontSize: 12.5,
                      fontWeight: 700,
                      color: themeVars.color.accentPrimary,
                      textAlign: "left",
                    }}
                  >
                    <Icon name="plus" size="sm" />
                    {query ? `‘${query}’ 검색 결과에 없나요? 신규 등록` : "상대 계약자 신규 등록"}
                  </button>
                }
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
