import { Controller, useFormContext } from "react-hook-form";
import { Card } from "@lawkit/ui";
import type { ContractRequestForm } from "../request-schema";
import { searchUsers, searchDepartments, searchProjects } from "../../../api/directory";
import { CardTitle, Field } from "./_shared";
import { EntityAutoComplete } from "./EntityAutoComplete";
import { RelatedDocsPicker } from "./RelatedDocsPicker";
import * as css from "../contractRequest.css";

export function PeopleSection() {
  // 원 계약은 개요의 원 계약 선택(originContract)이 따로 맡으므로, 관련문서는 계약 단계와 상관없이 늘 보인다.
  const { control } = useFormContext<ContractRequestForm>();
  return (
    <Card bordered header={<CardTitle num={3}>관계자 · 참조</CardTitle>}>
      <div className={css.grid2}>
        <Field label="참조수신자" info="진행 상황을 공유받을 참조 대상자입니다.">
          <Controller name="ccUsers" control={control} render={({ field }) => (
            <EntityAutoComplete queryKey="ccUsers" fetcher={searchUsers} multiple
              placeholder="이름으로 검색" value={field.value} onChange={field.onChange} />
          )} />
        </Field>

        <Field label="참조수신자(부서)" info="진행 상황을 공유받을 부서를 선택합니다.">
          <Controller name="ccDepts" control={control} render={({ field }) => (
            <EntityAutoComplete queryKey="ccDepts" fetcher={searchDepartments} multiple
              placeholder="부서명으로 검색" value={field.value} onChange={field.onChange} />
          )} />
        </Field>

        <Field label="참조수신자(비밀)">
          <Controller name="ccSecret" control={control} render={({ field }) => (
            <EntityAutoComplete queryKey="ccSecret" fetcher={searchUsers} multiple
              placeholder="이름으로 검색" value={field.value} onChange={field.onChange} />
          )} />
        </Field>

        <Field label="업무담당자" info="계약 실무를 담당하는 사람입니다.">
          <Controller name="owner" control={control} render={({ field }) => (
            <EntityAutoComplete queryKey="owner" fetcher={searchUsers}
              placeholder="이름으로 검색" value={field.value ? [field.value] : []}
              onChange={(entries) => field.onChange(entries[0] ?? null)} />
          )} />
        </Field>

        <Field label="관련 프로젝트">
          <Controller name="project" control={control} render={({ field }) => (
            <EntityAutoComplete queryKey="project" fetcher={searchProjects}
              placeholder="프로젝트명으로 검색" value={field.value ? [field.value] : []}
              onChange={(entries) => field.onChange(entries[0] ?? null)} />
          )} />
        </Field>

        <Field label="관련문서" info="이 계약과 연관된 기존 문서를 연결합니다.">
          <RelatedDocsPicker />
        </Field>
      </div>
    </Card>
  );
}
