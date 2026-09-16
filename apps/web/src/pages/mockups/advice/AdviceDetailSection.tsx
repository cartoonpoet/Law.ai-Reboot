import { Controller, useFormContext } from "react-hook-form";
import { Callout, Card, InputDatePicker, Radio, RadioGroup, TagSelect, Textarea } from "@lawkit/ui";
import { RichTextEditor } from "../../../components/ui/RichTextEditor";
import { CardTitle, ErrText, Field } from "../../contract/sections/_shared";
import { isoToDate, toISODate } from "../../contract/dateIso";
import { ADVICE_REGIONS, COUNTRY_OPTIONS, type AdviceRequestForm } from "./advice-schema";
import * as css from "../../contract/contractRequest.css";

/** 상세정보 — 지역 · 국가 · 사안의 배경 · 질의의 요지 · 기타 요청사항 · 회신 기한. */
export function AdviceDetailSection() {
  const { control, formState: { errors } } = useFormContext<AdviceRequestForm>();

  return (
    <Card bordered header={<CardTitle num={2}>상세정보</CardTitle>}>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div className={css.grid2}>
          <Field label="자문분류(지역)" required>
            <Controller name="region" control={control} render={({ field }) => (
              <RadioGroup value={field.value} onChange={field.onChange}>
                {ADVICE_REGIONS.map((region) => (
                  <Radio key={region.value} value={region.value} label={region.label} />
                ))}
              </RadioGroup>
            )} />
          </Field>

          <Field label="국가" required info="관련 국가를 모두 고릅니다.">
            <Controller name="countries" control={control} render={({ field }) => (
              <TagSelect options={COUNTRY_OPTIONS} value={field.value} onChange={field.onChange} placeholder="국가 선택" />
            )} />
            <ErrText msg={errors.countries?.message} />
          </Field>
        </div>

        <Field label="사안의 배경" required>
          <Callout>사안의 주요 경과와 현재 상황을 육하원칙에 맞춰 시간 순서로 적어 주세요.</Callout>
          <div className={css.fieldBlock}>
            <Controller name="background" control={control} render={({ field }) => (
              <RichTextEditor ariaLabel="사안의 배경" value={field.value} onChange={field.onChange}
                placeholder="언제 · 누가 · 무엇을 했고 지금 상황이 어떤지" />
            )} />
          </div>
          <ErrText msg={errors.background?.message} />
        </Field>

        <Field label="질의의 요지" required>
          <Callout>A안으로 진행해도 되는지, B안으로 하면 어떤 법적 책임이 생기는지처럼 묻고 싶은 것을 구체적으로 적어 주세요.</Callout>
          <div className={css.fieldBlock}>
            <Controller name="question" control={control} render={({ field }) => (
              <RichTextEditor ariaLabel="질의의 요지" value={field.value} onChange={field.onChange}
                placeholder="검토가 필요한 쟁점과 원하는 답의 형태" />
            )} />
          </div>
          <ErrText msg={errors.question?.message} />
        </Field>

        <Field label="기타 요청사항">
          <Controller name="etcRequest" control={control} render={({ field }) => (
            <Textarea rows={3} placeholder="회신 형식 · 참고 사항 등 그 밖에 알려줄 내용"
              value={field.value} onChange={field.onChange} />
          )} />
        </Field>

        <div className={css.grid2}>
          <Field label="자문 회신 기한" required info="이 날짜까지 회신이 필요하다는 뜻입니다.">
            <Controller name="dueDate" control={control} render={({ field }) => (
              <InputDatePicker
                value={isoToDate(field.value)}
                placeholder="YYYY-MM-DD"
                onChange={(date) => field.onChange(toISODate(date))}
              />
            )} />
            <ErrText msg={errors.dueDate?.message} />
          </Field>
        </div>
      </div>
    </Card>
  );
}
