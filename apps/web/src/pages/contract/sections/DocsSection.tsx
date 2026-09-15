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
  // 체결 결재가 시작된 계약 — 계약서·서명본은 읽기 전용, 첨부·참고서류는 추가만.
  isFileLocked?: boolean;
}

export function DocsSection({ contractId, isFileLocked = false }: DocsSectionProps = {}) {
  const { getValues, setValue, watch, formState: { errors } } = useFormContext<ContractRequestForm>();
  const [isFormsOpen, setIsFormsOpen] = useState(false);
  const registerAs = watch("registerAs");
  const isSigned = registerAs === "signed";
  const documentLockMode = isFileLocked ? "readOnly" : undefined;
  const attachmentLockMode = isFileLocked ? "addOnly" : undefined;

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
          {isFileLocked
            ? "체결 결재가 시작된 계약이라 계약서는 바꿀 수 없습니다. 첨부·참고서류는 추가만 할 수 있습니다."
            : isSigned
              ? "서명·날인이 완료된 최종본을 올려주세요. 서명본 기준으로 AI 리스크 분석이 실행됩니다."
              : "검토 정확도를 위해 편집 가능한 워드(.docx) 파일 첨부를 권장합니다. 첨부 즉시 AI가 주요 리스크 조항을 사전 점검합니다."}
        </Alert>

        {isSigned ? (
          <Field label="최종 서명본" required>
            <FileUploadField
              name="signedFiles"
              accept=".docx,.hwp,.pdf"
              description="파일을 여기에 드래그하거나 버튼을 클릭해 선택하세요. · 서명·날인이 완료된 원본(.pdf 권장)"
              contractId={contractId}
              lockMode={documentLockMode}
            />
            <ErrText msg={errors.signedFiles?.message} />
          </Field>
        ) : (
          <Field label="계약서" required>
            <FileUploadField
              name="contractFiles"
              accept=".docx,.hwp,.pdf"
              description="파일을 여기에 드래그하거나 버튼을 클릭해 선택하세요. · 가능한 워드(.docx) 권장"
              contractId={contractId}
              lockMode={documentLockMode}
            />
            <ErrText msg={errors.contractFiles?.message} />
          </Field>
        )}

        <div className={css.grid2}>
          <Field label="첨부 / 별첨">
            <FileUploadField
              name="attachFiles"
              description="드래그 또는 클릭"
              contractId={contractId}
              lockMode={attachmentLockMode}
            />
          </Field>
          <Field label="참고서류">
            <FileUploadField
              name="refFiles"
              description="드래그 또는 클릭"
              contractId={contractId}
              lockMode={attachmentLockMode}
            />
          </Field>
        </div>

        {!isFileLocked && (
          <div className={css.btnRow}>
            <Button type="button" variant="outline" color="secondary" size="small" onClick={() => setIsFormsOpen(true)}>표준계약서 양식 보기</Button>
          </div>
        )}

        {isFormsOpen && <StandardFormsModal onClose={() => setIsFormsOpen(false)} onAttach={handleAttachForm} />}
      </div>
    </Card>
  );
}
