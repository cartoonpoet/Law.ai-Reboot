import { Controller, useFormContext } from "react-hook-form";
import { Card, InputGroup, Button } from "@lawkit/ui";
import type { ContractRequestForm } from "../request-schema";
import { RichTextEditor } from "../../../components/ui/RichTextEditor";
import { CardTitle, ErrText } from "./_shared";

const EDITORS: { name: "payTerms" | "purpose" | "keyPoints" | "concerns"; label: string; required?: boolean }[] = [
  { name: "payTerms", label: "계약 지급 조건" },
  { name: "purpose", label: "계약의 배경 및 목적", required: true },
  { name: "keyPoints", label: "주요 협의사항" },
  { name: "concerns", label: "요청부서의 우려사항 및 기타 고려사항" },
];

export function ContentSection() {
  const { control, formState: { errors } } = useFormContext<ContractRequestForm>();
  return (
    <Card bordered header={<CardTitle icon="edit" num={5}>상세 내용</CardTitle>}>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {EDITORS.map((e) => (
          <InputGroup key={e.name} label={e.label} required={e.required}>
            <Controller name={e.name} control={control} render={({ field }) => (
              <RichTextEditor ariaLabel={e.label} value={field.value} onChange={field.onChange} />
            )} />
            {e.name === "purpose" && <ErrText msg={errors.purpose?.message} />}
          </InputGroup>
        ))}
        <InputGroup label="기타 URL">
          <Button type="button" variant="outline" color="secondary" size="small">+ 추가</Button>
        </InputGroup>
      </div>
    </Card>
  );
}
