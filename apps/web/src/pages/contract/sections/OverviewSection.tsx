import { useState } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import { Card, InputGroup, Input, ButtonGroup, RadioGroup, Radio, Dropdown, AutoComplete, DateRangePicker, Modal, Checkbox, Button, Icon, themeVars } from "@lawkit/ui";
import { LIST_FILTERS } from "../mock-data";
import type { ContractRequestForm } from "../request-schema";
import { USER_OPTIONS, CAT_MINOR_OPTIONS, toOptions } from "../contractOptions";
import { CardTitle, ErrText } from "./_shared";
import * as css from "../contractRequest.css";

const pickSingle = (v: string | string[]) => (Array.isArray(v) ? v[0] ?? "" : v);

const toISODate = (date: Date | null): string => (date ? date.toISOString().slice(0, 10) : "");
const isoToDate = (iso: string): Date | null => (iso ? new Date(iso) : null);

export function OverviewSection() {
  const { control, setValue, formState: { errors } } = useFormContext<ContractRequestForm>();
  const periodStart = useWatch({ control, name: "periodStart" });
  const periodEnd = useWatch({ control, name: "periodEnd" });
  const rangeLabel = periodStart || periodEnd ? `${periodStart || "…"} ~ ${periodEnd || "…"}` : "";
  const [periodOpen, setPeriodOpen] = useState(false);
  return (
    <Card bordered header={<CardTitle num={1}>계약 개요</CardTitle>}>
      <div className={css.grid2}>
        <InputGroup label="계약 단계" required>
          <Controller name="stage" control={control} render={({ field }) => (
            <RadioGroup value={field.value} onChange={field.onChange}>
              <Radio value="new" label="신규계약" />
              <Radio value="change" label="변경·해지" />
            </RadioGroup>
          )} />
        </InputGroup>

        <InputGroup label="보안여부">
          <Controller name="secure" control={control} render={({ field }) => (
            <ButtonGroup value={field.value} onChange={field.onChange} variant="outline"
              items={[
                { value: "top", label: "극비", icon: <Icon name="lock" size="sm" /> },
                { value: "secure", label: "보안", icon: <Icon name="shield" size="sm" /> },
                { value: "normal", label: "일반" },
              ]} />
          )} />
        </InputGroup>

        <InputGroup label="계약명" required className={css.full}>
          <Controller name="name" control={control} render={({ field }) => (
            <Input placeholder="계약명을 입력하세요" value={field.value} onChange={field.onChange} />
          )} />
          <ErrText msg={errors.name?.message} />
        </InputGroup>

        <InputGroup label="검토 요청자" required>
          <Controller name="requester" control={control} render={({ field }) => (
            <AutoComplete options={USER_OPTIONS} value={field.value} placeholder="검토 요청자 선택"
              onChange={(v) => field.onChange(pickSingle(v))} />
          )} />
          <ErrText msg={errors.requester?.message} />
        </InputGroup>

        <InputGroup label="계약서 유형" required>
          <Controller name="ctype" control={control} render={({ field }) => (
            <RadioGroup value={field.value} onChange={field.onChange}>
              <Radio value="normal" label="일반 검토요청" />
              <Radio value="std" label="표준계약서 계약체결" />
            </RadioGroup>
          )} />
        </InputGroup>

        <InputGroup label="계약 분류" required className={css.full}>
          <div className={css.grid3}>
            <Controller name="party" control={control} render={({ field }) => (
              <Dropdown options={toOptions(LIST_FILTERS.party.slice(1))} value={field.value} placeholder="계약 당사자"
                onChange={(v) => field.onChange(pickSingle(v))} />
            )} />
            <Controller name="catMajor" control={control} render={({ field }) => (
              <Dropdown options={toOptions(LIST_FILTERS.cat.slice(1))} value={field.value} placeholder="계약 대분류"
                onChange={(v) => field.onChange(pickSingle(v))} />
            )} />
            <Controller name="catMinor" control={control} render={({ field }) => (
              <Dropdown options={CAT_MINOR_OPTIONS} value={field.value} placeholder="계약 중분류"
                onChange={(v) => field.onChange(pickSingle(v))} />
            )} />
          </div>
          <ErrText msg={errors.party?.message ?? errors.catMajor?.message ?? errors.catMinor?.message} />
        </InputGroup>

        <InputGroup label="계약 기간" className={css.full}>
          <div onClick={() => setPeriodOpen(true)} style={{ cursor: "pointer" }}>
            <Input
              readOnly
              value={rangeLabel}
              placeholder="YYYY-MM-DD ~ YYYY-MM-DD"
              leftIcon={<Icon name="calendar" size="sm" style={{ width: 15, height: 15, color: themeVars.color.textMuted }} />}
            />
          </div>
          <Modal
            open={periodOpen}
            onClose={() => setPeriodOpen(false)}
            size="large"
            title="계약 기간 선택"
            footer={<Button type="button" onClick={() => setPeriodOpen(false)}>확인</Button>}
          >
            <DateRangePicker
              startDate={isoToDate(periodStart)}
              endDate={isoToDate(periodEnd)}
              onChange={(range) => {
                setValue("periodStart", toISODate(range.start));
                setValue("periodEnd", toISODate(range.end));
              }}
            />
          </Modal>
          <div style={{ display: "flex", gap: 18, marginTop: 9 }}>
            <Controller name="periodManual" control={control} render={({ field }) => (
              <Checkbox label="직접 입력" checked={field.value} onCheckedChange={field.onChange} />
            )} />
            <Controller name="noEndDate" control={control} render={({ field }) => (
              <Checkbox label="계약 종료일 없음" checked={field.value} onCheckedChange={field.onChange} />
            )} />
          </div>
        </InputGroup>

        <InputGroup label="상대 계약자 정보" required className={css.full}>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1, maxWidth: 420 }}>
              <Controller name="counterparty" control={control} render={({ field }) => (
                <Input placeholder="회사명" value={field.value} onChange={field.onChange}
                  leftIcon={<Icon name="user" size="sm" style={{ width: 15, height: 15, color: themeVars.color.textMuted }} />} />
              )} />
            </div>
            <Button type="button" variant="outline" color="secondary">신규 추가</Button>
          </div>
          <ErrText msg={errors.counterparty?.message} />
        </InputGroup>
      </div>
    </Card>
  );
}
