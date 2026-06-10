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
import * as css from "./contractRequest.css";

export function ContractRequestPage() {
  const navigate = useNavigate();
  const methods = useForm<ContractRequestForm>({
    resolver: zodResolver(contractRequestSchema),
    defaultValues: contractRequestDefaults,
    mode: "onSubmit",
  });

  const handleValid = () => navigate("/contract/C20250710-0004");

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(handleValid)}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 18 }}>
          <div>
            <Eyebrow style={{ marginBottom: 7 }}>계약</Eyebrow>
            <h1 style={{ margin: 0, fontSize: 23, fontWeight: 800, color: themeVars.color.textHeading, letterSpacing: "-0.025em" }}>계약서 검토 요청</h1>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button type="button" variant="outline" color="secondary" onClick={() => navigate("/contract/list")}>목록</Button>
            <Button type="button" variant="outline" color="secondary">임시저장</Button>
            <Button type="submit" iconLeft={<Icon name="submit" size="sm" style={{ width: 14, height: 14 }} />}>검토요청 등록</Button>
          </div>
        </div>

        <div className={css.layout}>
          <div className={css.formCol}>
            <OverviewSection />
            <DocsSection />
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
