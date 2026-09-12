import { Controller, useFormContext, useFieldArray } from "react-hook-form";
import {
  Card,
  RadioGroup,
  Radio,
  InputDatePicker,
  Slider,
  Dropdown,
  NumberInput,
  Button,
  Alert,
  Input,
  Icon,
} from "@lawkit/ui";
import type { ContractRequestForm } from "../request-schema";
import { VAT_OPTIONS, CURRENCY_OPTIONS } from "../request-schema";
import { CardTitle, ErrText, Field } from "./_shared";
import { toISODate, isoToDate } from "../dateIso";
import * as css from "../contractRequest.css";

const pickSingle = (v: string | string[]) => (Array.isArray(v) ? v[0] ?? "" : v);

export function TermsSection() {
  const {
    control,
    formState: { errors },
  } = useFormContext<ContractRequestForm>();
  const { fields, append, remove } = useFieldArray({ control, name: "money" });

  return (
    <Card bordered header={<CardTitle num={4}>상세 조건</CardTitle>}>
      <div className={css.grid2}>
        <Field label="계약 언어">
          <Controller
            name="lang"
            control={control}
            render={({ field }) => (
              <RadioGroup value={field.value} onChange={field.onChange}>
                <Radio value="ko" label="국문" />
                <Radio value="en" label="영문" />
                <Radio value="koen" label="국영" />
                <Radio value="etc" label="기타" />
              </RadioGroup>
            )}
          />
        </Field>

        <Field label="법무 분류">
          <Controller
            name="legal"
            control={control}
            render={({ field }) => (
              <RadioGroup value={field.value} onChange={field.onChange}>
                <Radio value="dom" label="국내 법무" />
                <Radio value="intl" label="해외 법무" />
              </RadioGroup>
            )}
          />
        </Field>

        <Field label="계약예정일">
          <Controller
            name="expectedDate"
            control={control}
            render={({ field }) => (
              <InputDatePicker
                value={isoToDate(field.value)}
                placeholder="YYYY-MM-DD"
                onChange={(d) => field.onChange(toISODate(d))}
              />
            )}
          />
        </Field>

        <Field label="계약상대방 협상력" info="상대방 대비 우리 측의 협상 우위 정도입니다.">
          <Controller
            name="negotiation"
            control={control}
            render={({ field }) => (
              <Slider
                value={field.value}
                onChange={field.onChange}
                min={0}
                max={100}
                step={5}
                showValue
              />
            )}
          />
        </Field>

        <Field label="계약 규모(대가)" info="총액이 정해지지 않은 경우 항목을 추가해 입력하세요." required className={css.full}>
          {fields.map((row, i) => (
            <div key={row.id} className={css.moneyRow}>
              <div className={css.moneyVat}>
                <Controller
                  name={`money.${i}.vat`}
                  control={control}
                  render={({ field }) => (
                    <Dropdown
                      options={[...VAT_OPTIONS]}
                      value={field.value}
                      onChange={(v) => field.onChange(pickSingle(v))}
                    />
                  )}
                />
              </div>
              <div className={css.moneyAmount}>
                <Controller
                  name={`money.${i}.amount`}
                  control={control}
                  render={({ field }) => (
                    <NumberInput
                      value={field.value ?? 0}
                      onChange={field.onChange}
                      min={0}
                    />
                  )}
                />
              </div>
              <div className={css.moneyCurrency}>
                <Controller
                  name={`money.${i}.currency`}
                  control={control}
                  render={({ field }) => (
                    <Dropdown
                      options={[...CURRENCY_OPTIONS]}
                      value={field.value}
                      onChange={(v) => field.onChange(pickSingle(v))}
                    />
                  )}
                />
              </div>
              {fields.length > 1 && (
                <div className={css.moneyDelete}>
                  <Button
                    type="button"
                    variant="outline"
                    color="secondary"
                    size="small"
                    iconLeft={<Icon name="trash" size="sm" />}
                    onClick={() => remove(i)}
                    aria-label="이 항목 삭제"
                  />
                </div>
              )}
            </div>
          ))}
          <div className={css.btnRow}>
            <Button
              type="button"
              variant="outline"
              color="secondary"
              size="small"
              onClick={() => append({ vat: "excluded", amount: null, currency: "KRW" })}
            >
              추가하기
            </Button>
          </div>
          <div className={css.fieldBlock}>
            <Alert type="info" size="small">
              계약금액 총액이 정해진 게 아닌 품목단가 / Time Charge / Service 청구 등에 해당될
              경우 본 항목을 사용하세요.
            </Alert>
          </div>
          <div className={css.fieldBlock}>
            <Controller
              name="moneyNote"
              control={control}
              render={({ field }) => (
                <Input
                  placeholder="내용을 입력해 주세요"
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </div>
          <ErrText msg={errors.money?.message as string | undefined} />
        </Field>
      </div>
    </Card>
  );
}
