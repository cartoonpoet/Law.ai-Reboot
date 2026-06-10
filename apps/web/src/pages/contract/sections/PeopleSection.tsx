import { Controller, useFormContext } from "react-hook-form";
import { Card, InputGroup, AutoComplete, ChipsNavigation, Dropdown, Button } from "@lawkit/ui";
import type { ContractRequestForm } from "../request-schema";
import { USER_OPTIONS, DEPT_CHIPS, PROJECT_OPTIONS } from "../contractOptions";
import { CardTitle } from "./_shared";
import * as css from "../contractRequest.css";

const toArr = (v: string | string[]) => (Array.isArray(v) ? v : [v]);
const pickSingle = (v: string | string[]) => (Array.isArray(v) ? v[0] ?? "" : v);

export function PeopleSection() {
  const { control } = useFormContext<ContractRequestForm>();
  return (
    <Card bordered header={<CardTitle icon="approvalCompleted" num={3}>관계자 · 참조</CardTitle>}>
      <div className={css.grid2}>
        <InputGroup label="참조수신자">
          <Controller name="ccUsers" control={control} render={({ field }) => (
            <AutoComplete options={USER_OPTIONS} multiple value={field.value}
              placeholder="참조수신자 선택" onChange={(v) => field.onChange(toArr(v))} />
          )} />
        </InputGroup>

        <InputGroup label="참조수신자(부서)">
          <Controller name="ccDepts" control={control} render={({ field }) => (
            <ChipsNavigation items={DEPT_CHIPS} multiple value={field.value} onChange={(v) => field.onChange(toArr(v))} />
          )} />
        </InputGroup>

        <InputGroup label="참조수신자(비밀)">
          <Controller name="ccSecret" control={control} render={({ field }) => (
            <AutoComplete options={USER_OPTIONS} multiple value={field.value}
              placeholder="참조수신자(비밀) 선택" onChange={(v) => field.onChange(toArr(v))} />
          )} />
        </InputGroup>

        <InputGroup label="업무담당자">
          <Controller name="owner" control={control} render={({ field }) => (
            <AutoComplete options={USER_OPTIONS} value={field.value}
              placeholder="업무담당자 선택" onChange={(v) => field.onChange(pickSingle(v))} />
          )} />
        </InputGroup>

        <InputGroup label="관련 프로젝트">
          <Controller name="project" control={control} render={({ field }) => (
            <Dropdown options={PROJECT_OPTIONS} value={field.value} placeholder="관련 프로젝트 선택"
              onChange={(v) => field.onChange(pickSingle(v))} />
          )} />
        </InputGroup>

        <InputGroup label="관련문서">
          <div style={{ height: 42, display: "flex", alignItems: "center" }}>
            <Button type="button" variant="outline" color="secondary" size="small">찾아보기</Button>
          </div>
        </InputGroup>
      </div>
    </Card>
  );
}
