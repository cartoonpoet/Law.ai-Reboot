import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Button, Icon, themeVars } from "@lawkit/ui";
import { Eyebrow } from "../../../components/ui/Eyebrow";
import { AdviceBasicSection } from "./AdviceBasicSection";
import { AdviceDetailSection } from "./AdviceDetailSection";
import { AdviceRail } from "./AdviceRail";
import { adviceRequestDefaults, adviceRequestSchema, type AdviceRequestForm } from "./advice-schema";
import * as css from "../../contract/contractRequest.css";

/**
 * 법률자문 요청 시안 — 계약서 검토 요청 폼과 같은 부품·같은 배치로 만든 화면.
 * 저장은 하지 않는다(시안). 채택되면 이 파일이 그대로 /advice/request 가 된다.
 */
export function AdviceRequestMock() {
  const methods = useForm<AdviceRequestForm>({
    resolver: zodResolver(adviceRequestSchema),
    defaultValues: adviceRequestDefaults,
    mode: "onSubmit",
  });

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(() => undefined)}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 18 }}>
          <div>
            <Eyebrow style={{ marginBottom: 7 }}>법무 업무</Eyebrow>
            <h1 style={{ margin: 0, fontSize: 23, fontWeight: 800, color: themeVars.color.textHeading, letterSpacing: "-0.025em" }}>
              법률자문 요청
            </h1>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button type="button" variant="outline" color="secondary">목록</Button>
            <Button type="button" variant="outline" color="secondary">임시저장</Button>
            <Button type="submit" iconLeft={<Icon name="submit" size="sm" className={css.submitIcon} />}>자문 요청</Button>
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <Alert type="info" size="small">
            시안 화면입니다. 입력·검증은 실제로 동작하지만 저장되지 않아요.
          </Alert>
        </div>

        <div className={css.layout}>
          <div className={css.formCol}>
            <AdviceBasicSection />
            <AdviceDetailSection />
          </div>
          <AdviceRail />
        </div>
      </form>
    </FormProvider>
  );
}
