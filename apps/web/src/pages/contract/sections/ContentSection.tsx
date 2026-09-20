import { Controller, useFormContext, useFieldArray } from "react-hook-form";
import { Card, Button, Input, Icon } from "@lawkit/ui";
import type { ContractRequestForm } from "../request-schema";
import { RichTextEditor } from "../../../components/ui/RichTextEditor";
import { CardTitle, ErrText, Field } from "./_shared";
import * as css from "../contractRequest.css";

const EDITORS: { name: "payTerms" | "purpose" | "keyPoints" | "concerns"; label: string; info: string; required?: boolean }[] = [
  { name: "payTerms", label: "계약 지급 조건", info: "대금 지급 시기·방법 등 지급 관련 조건을 적습니다." },
  { name: "purpose", label: "계약의 배경 및 목적", info: "이 계약을 체결하려는 배경과 목적을 적습니다.", required: true },
  { name: "keyPoints", label: "주요 협의사항", info: "상대방과 합의한 핵심 사항을 적습니다." },
  { name: "concerns", label: "요청부서의 우려사항 및 기타 고려사항", info: "검토 시 유의할 우려·요청 사항을 적습니다." },
];

export function ContentSection() {
  const { control, formState: { errors } } = useFormContext<ContractRequestForm>();
  const { fields, append, remove } = useFieldArray({ control, name: "urls" });
  return (
    <Card bordered header={<CardTitle num={5}>상세 내용</CardTitle>}>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {EDITORS.map((e) => (
          <Field key={e.name} label={e.label} info={e.info} required={e.required}>
            <Controller name={e.name} control={control} render={({ field }) => (
              <RichTextEditor
                ariaLabel={e.label}
                value={field.value}
                onChange={field.onChange}
                placeholder={e.info}
                withTable
                withFullToolbar
              />
            )} />
            {e.name === "purpose" && <ErrText msg={errors.purpose?.message} />}
          </Field>
        ))}
        <Field label="기타 URL" info="참고할 외부 링크를 추가합니다.">
          {fields.length > 0 && (
            <div className={css.urlList}>
              {fields.map((row, i) => (
                <div key={row.id} className={css.urlRow}>
                  <div className={css.urlInput}>
                    <Controller name={`urls.${i}.value`} control={control} render={({ field }) => (
                      <Input value={field.value} placeholder="https://example.com" onChange={field.onChange} />
                    )} />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    color="secondary"
                    size="small"
                    iconLeft={<Icon name="trash" size="sm" />}
                    onClick={() => remove(i)}
                    aria-label="URL 삭제"
                  />
                </div>
              ))}
            </div>
          )}
          <div className={css.btnRow}>
            <Button type="button" variant="outline" color="secondary" size="small" onClick={() => append({ value: "" })}>
              + 추가
            </Button>
          </div>
        </Field>
      </div>
    </Card>
  );
}
