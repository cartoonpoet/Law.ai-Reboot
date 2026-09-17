import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { Button, Icon } from "@lawkit/ui";
import { Eyebrow } from "../../../components/ui/Eyebrow";
import { useCreateAdvice } from "../hooks/useCreateAdvice";
import { adviceRequestSchema, type AdviceRequestFormTypes } from "./adviceRequestSchema";
import { AdviceBasicSection } from "./AdviceBasicSection";
import { AdviceDetailSection } from "./AdviceDetailSection";
import { AdviceRequestRail } from "./AdviceRequestRail";
import * as formCss from "../../contract/contractRequest.css";
import * as shared from "../adviceShared.css";

interface AdviceRequestFormProps {
  initialValues: AdviceRequestFormTypes;
}

/** 법률자문 요청 폼 — 계약서 검토 요청 폼과 같은 부품·배치. */
export const AdviceRequestForm = ({ initialValues }: AdviceRequestFormProps) => {
  const navigate = useNavigate();
  const { submitAdvice, isSubmitting } = useCreateAdvice();
  const methods = useForm<AdviceRequestFormTypes>({
    resolver: zodResolver(adviceRequestSchema),
    defaultValues: initialValues,
    mode: "onSubmit",
  });

  const handleSubmit = methods.handleSubmit((form) => submitAdvice(form));

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit} noValidate>
        <div className={shared.pageHead}>
          <div className={shared.pageTitleGroup}>
            <Eyebrow>법률자문</Eyebrow>
            <h1 className={shared.pageTitle}>법률자문 요청</h1>
          </div>
          <div className={shared.pageActions}>
            <Button type="button" variant="outline" color="secondary" onClick={() => navigate("/advice/list")}>
              목록
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              iconLeft={<Icon name="submit" size="sm" className={formCss.submitIcon} />}
            >
              {isSubmitting ? "요청하는 중…" : "자문 요청"}
            </Button>
          </div>
        </div>

        <div className={formCss.layout}>
          <div className={formCss.formCol}>
            <AdviceBasicSection />
            <AdviceDetailSection />
          </div>
          <AdviceRequestRail />
        </div>
      </form>
    </FormProvider>
  );
};
