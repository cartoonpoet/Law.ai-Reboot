import { useFormContext } from "react-hook-form";
import { Card, Alert, Button } from "@lawkit/ui";
import type { ContractRequestForm } from "../request-schema";
import { CardTitle, ErrText, Field } from "./_shared";
import { FileUploadField } from "./FileUploadField";
import * as css from "../contractRequest.css";

export function DocsSection() {
  const { formState: { errors } } = useFormContext<ContractRequestForm>();
  return (
    <Card bordered header={<CardTitle num={2}>계약서 · 첨부</CardTitle>}>
      <div className={css.docsBody}>
        <Alert type="info" size="small">
          검토 정확도를 위해 편집 가능한 워드(.docx) 파일 첨부를 권장합니다. 첨부 즉시 AI가 주요 리스크 조항을 사전 점검합니다.
        </Alert>

        <Field label="계약서" required>
          <FileUploadField
            name="contractFiles"
            accept=".docx,.hwp,.pdf"
            description="파일을 여기에 드래그하거나 버튼을 클릭해 선택하세요. · 가능한 워드(.docx) 권장"
          />
          <ErrText msg={errors.contractFiles?.message} />
        </Field>

        <div className={css.grid2}>
          <Field label="첨부 / 별첨">
            <FileUploadField name="attachFiles" description="드래그 또는 클릭" />
          </Field>
          <Field label="참고서류">
            <FileUploadField name="refFiles" description="드래그 또는 클릭" />
          </Field>
        </div>

        <div className={css.btnRow}>
          <Button type="button" variant="outline" color="secondary" size="small">표준계약서 양식 보기</Button>
          <Button type="button" variant="outline" color="secondary" size="small">관련문서 찾아보기</Button>
        </div>
      </div>
    </Card>
  );
}
