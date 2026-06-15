import { Controller, useFormContext } from "react-hook-form";
import { Card, AutoComplete, ChipsNavigation, Dropdown, Button } from "@lawkit/ui";
import type { ContractRequestForm } from "../request-schema";
import { USER_OPTIONS, DEPT_CHIPS, PROJECT_OPTIONS } from "../contractOptions";
import { CardTitle, Field } from "./_shared";
import * as css from "../contractRequest.css";

const toArr = (v: string | string[]) => (Array.isArray(v) ? v : [v]);
const pickSingle = (v: string | string[]) => (Array.isArray(v) ? v[0] ?? "" : v);

export function PeopleSection() {
  const { control } = useFormContext<ContractRequestForm>();
  return (
    <Card bordered header={<CardTitle num={3}>관계자 · 참조</CardTitle>}>
      <div className={css.grid2}>
        <Field label="참조수신자" info="진행 상황을 공유받을 참조 대상자입니다.">
          <Controller name="ccUsers" control={control} render={({ field }) => (
            <AutoComplete options={USER_OPTIONS} multiple value={field.value}
              placeholder="참조수신자 선택" onChange={(v) => field.onChange(toArr(v))} />
          )} />
        </Field>

        <Field label="참조수신자(부서)" info="진행 상황을 공유받을 부서를 선택합니다.">
          <Controller name="ccDepts" control={control} render={({ field }) => (
            <ChipsNavigation items={DEPT_CHIPS} multiple value={field.value} onChange={(v) => field.onChange(toArr(v))} />
          )} />
        </Field>

        <Field label="참조수신자(비밀)">
          <Controller name="ccSecret" control={control} render={({ field }) => (
            <AutoComplete options={USER_OPTIONS} multiple value={field.value}
              placeholder="참조수신자(비밀) 선택" onChange={(v) => field.onChange(toArr(v))} />
          )} />
        </Field>

        <Field label="업무담당자" info="계약 실무를 담당하는 사람입니다.">
          <Controller name="owner" control={control} render={({ field }) => (
            <AutoComplete options={USER_OPTIONS} value={field.value}
              placeholder="업무담당자 선택" onChange={(v) => field.onChange(pickSingle(v))} />
          )} />
        </Field>

        <Field label="관련 프로젝트">
          <Controller name="project" control={control} render={({ field }) => (
            <Dropdown options={PROJECT_OPTIONS} value={field.value} placeholder="관련 프로젝트 선택"
              onChange={(v) => field.onChange(pickSingle(v))} />
          )} />
        </Field>

        <Field label="관련문서" info="이 계약과 연관된 기존 문서를 연결합니다.">
          <div style={{ height: 42, display: "flex", alignItems: "center" }}>
            <Button type="button" variant="outline" color="secondary" size="small">찾아보기</Button>
          </div>
        </Field>
      </div>
    </Card>
  );
}
