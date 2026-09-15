import { useNavigate } from "react-router-dom";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Icon, Button, themeVars } from "@lawkit/ui";
import { Eyebrow } from "../../components/ui/Eyebrow";
import { contractRequestSchema, contractRequestDefaults, type ContractRequestForm } from "./request-schema";
import { OverviewSection } from "./sections/OverviewSection";
import { DocsSection } from "./sections/DocsSection";
import { PeopleSection } from "./sections/PeopleSection";
import { TermsSection } from "./sections/TermsSection";
import { ContentSection } from "./sections/ContentSection";
import { SmartRail } from "./rail/SmartRail";
import { useContractSubmit } from "./hooks/useContractSubmit";
import * as css from "./contractRequest.css";

interface ContractRequestPageProps {
  mode?: "create" | "edit";
  contractId?: string;
  initialValues?: ContractRequestForm;
  // 편집 모드에서 체결 결재가 시작된 계약 — 계약서 읽기 전용, 첨부는 추가만(contractFileLock).
  isFileLocked?: boolean;
}

export function ContractRequestPage({
  mode = "create",
  contractId,
  initialValues,
  isFileLocked = false,
}: ContractRequestPageProps = {}) {
  const navigate = useNavigate();
  const { submit, isSubmitting, submitError } = useContractSubmit(mode, contractId);
  const methods = useForm<ContractRequestForm>({
    resolver: zodResolver(contractRequestSchema),
    defaultValues: initialValues ?? contractRequestDefaults,
    mode: "onSubmit",
  });

  const isEdit = mode === "edit";
  const handleValid = (form: ContractRequestForm) => submit(form);

  const registerAs = methods.watch("registerAs");
  const stage = methods.watch("stage");
  const isSigned = registerAs === "signed";
  const pageTitle = isSigned
    ? stage === "change" ? "체결 변경계약 등록" : "체결 계약 등록"
    : "계약서 검토 요청";
  const submitLabel = isSubmitting
    ? (isEdit ? "저장 중…" : "등록 중…")
    : isEdit ? "수정 저장" : isSigned ? "체결 계약 등록" : "검토요청 등록";

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(handleValid)}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 18 }}>
          <div>
            <Eyebrow style={{ marginBottom: 7 }}>계약</Eyebrow>
            <h1 style={{ margin: 0, fontSize: 23, fontWeight: 800, color: themeVars.color.textHeading, letterSpacing: "-0.025em" }}>{pageTitle}</h1>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button type="button" variant="outline" color="secondary" onClick={() => navigate("/contract/list")}>목록</Button>
            <Button type="button" variant="outline" color="secondary">임시저장</Button>
            <Button type="submit" disabled={isSubmitting} iconLeft={<Icon name="submit" size="sm" className={css.submitIcon} />}>{submitLabel}</Button>
          </div>
        </div>

        {submitError && (
          <p role="alert" className={css.submitError}>{submitError}</p>
        )}

        <div className={css.layout}>
          <div className={css.formCol}>
            <OverviewSection />
            <DocsSection contractId={contractId} isFileLocked={isFileLocked} />
            <PeopleSection />
            <TermsSection />
            <ContentSection />
          </div>
          <SmartRail />
        </div>
      </form>
    </FormProvider>
  );
}
