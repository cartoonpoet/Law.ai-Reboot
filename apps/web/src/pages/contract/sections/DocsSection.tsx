import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { Card, Alert, Button } from "@lawkit/ui";
import type { ContractRequestForm } from "../request-schema";
import type { StandardForm } from "../../../api/standardForms";
import { CardTitle, ErrText, Field } from "./_shared";
import { FileUploadField } from "./FileUploadField";
import { StandardFormsModal } from "./StandardFormsModal";
import * as css from "../contractRequest.css";

interface DocsSectionProps {
  // 편집 모드의 contractId — FileUploadField 가 R2 업로드 활성화. 신규 작성은 undefined.
  contractId?: string;
}

export function DocsSection({ contractId }: DocsSectionProps = {}) {
  const { getValues, setValue, formState: { errors } } = useFormContext<ContractRequestForm>();
  const [isFormsOpen, setIsFormsOpen] = useState(false);

  const handleAttachForm = (form: StandardForm) => {
    setValue(
      "contractFiles",
      [
        ...getValues("contractFiles"),
        {
          id: null,
          name: `${form.name} ${form.version}.docx`,
          meta: "표준양식 · DOCX",
          mimeType: null,
        },
      ],
      { shouldValidate: true },
    );
    setIsFormsOpen(false);
  };

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
            contractId={contractId}
          />
          <ErrText msg={errors.contractFiles?.message} />
        </Field>

        <div className={css.grid2}>
          <Field label="첨부 / 별첨">
            <FileUploadField
              name="attachFiles"
              description="드래그 또는 클릭"
              contractId={contractId}
            />
          </Field>
          <Field label="참고서류">
            <FileUploadField
              name="refFiles"
              description="드래그 또는 클릭"
              contractId={contractId}
            />
          </Field>
        </div>

        <div className={css.btnRow}>
          <Button type="button" variant="outline" color="secondary" size="small" onClick={() => setIsFormsOpen(true)}>표준계약서 양식 보기</Button>
        </div>

        {isFormsOpen && <StandardFormsModal onClose={() => setIsFormsOpen(false)} onAttach={handleAttachForm} />}
      </div>
    </Card>
  );
}
