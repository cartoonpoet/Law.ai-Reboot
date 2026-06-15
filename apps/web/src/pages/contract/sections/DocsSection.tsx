import { Controller, useFormContext } from "react-hook-form";
import { Card, Alert, FileUploadArea, Button } from "@lawkit/ui";
import type { ContractRequestForm } from "../request-schema";
import { CardTitle, ErrText, Field } from "./_shared";
import * as css from "../contractRequest.css";

export function DocsSection() {
  const { control, formState: { errors } } = useFormContext<ContractRequestForm>();
  return (
    <Card bordered header={<CardTitle num={2}>계약서 · 첨부</CardTitle>}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Alert type="info" size="small">
          검토 정확도를 위해 편집 가능한 워드(.docx) 파일 첨부를 권장합니다. 첨부 즉시 우측에서 AI가 주요 리스크 조항을 사전 점검합니다.
        </Alert>

        <Field label="계약서" required>
          <Controller name="contractFiles" control={control} render={({ field }) => (
            <FileUploadArea accept=".docx,.hwp,.pdf"
              description=".docx · .hwp · .pdf · 최대 30MB — 가능한 워드 권장"
              onFilesAdded={(files) => field.onChange([...field.value, ...files.map((f) => f.name)])} />
          )} />
          <ErrText msg={errors.contractFiles?.message} />
        </Field>

        <div className={css.grid2}>
          <Field label="첨부 / 별첨">
            <Controller name="attachFiles" control={control} render={({ field }) => (
              <FileUploadArea description="드래그 또는 클릭"
                onFilesAdded={(files) => field.onChange([...field.value, ...files.map((f) => f.name)])} />
            )} />
          </Field>
          <Field label="참고서류">
            <Controller name="refFiles" control={control} render={({ field }) => (
              <FileUploadArea description="드래그 또는 클릭"
                onFilesAdded={(files) => field.onChange([...field.value, ...files.map((f) => f.name)])} />
            )} />
          </Field>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Button type="button" variant="outline" color="secondary" size="small">표준계약서 양식 보기</Button>
          <Button type="button" variant="outline" color="secondary" size="small">관련문서 찾아보기</Button>
        </div>
      </div>
    </Card>
  );
}
