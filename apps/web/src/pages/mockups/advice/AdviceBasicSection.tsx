import { useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { Button, ButtonGroup, Card, Checkbox, FileItem, FileUploadArea, Input } from "@lawkit/ui";
import { searchDepartments, searchProjects, searchUsers } from "../../../api/directory";
import { formatFileMeta } from "../../contract/fileMeta";
import { CardTitle, ErrText, Field } from "../../contract/sections/_shared";
import { EntityAutoComplete } from "../../contract/sections/EntityAutoComplete";
import { ADVICE_CATEGORIES, SECURITY_LEVELS, type AdviceRequestForm } from "./advice-schema";
import * as css from "../../contract/contractRequest.css";

/** 기본정보 — 자문명 · 분류 · 보안 · 요청자 · 첨부 · 참조 · 담당 · 관련 항목. */
export function AdviceBasicSection() {
  const { control, formState: { errors } } = useFormContext<AdviceRequestForm>();
  // 시안이라 실제 업로드는 하지 않고 고른 파일 이름·용량만 보여준다(계약 폼과 같은 메타 형식).
  const [files, setFiles] = useState<{ name: string; meta: string }[]>([]);

  return (
    <Card bordered header={<CardTitle num={1}>기본정보</CardTitle>}>
      <div className={css.grid2}>
        <div className={css.full}>
          <Field label="자문명" required>
            <Controller name="title" control={control} render={({ field }) => (
              <Input inputSize="medium" placeholder="자문명을 입력해 주세요" value={field.value} onChange={field.onChange} />
            )} />
            <ErrText msg={errors.title?.message} />
          </Field>
        </div>

        <div className={css.full}>
          <Field label="자문분류(내용)" required info="자문 내용에 해당하는 분야를 모두 고릅니다.">
            <Controller name="categories" control={control} render={({ field }) => (
              <div className={css.grid4}>
                {ADVICE_CATEGORIES.map((name) => (
                  <Checkbox
                    key={name}
                    label={name}
                    checked={field.value.includes(name)}
                    onCheckedChange={(checked) =>
                      field.onChange(checked ? [...field.value, name] : field.value.filter((v) => v !== name))
                    }
                  />
                ))}
              </div>
            )} />
            <ErrText msg={errors.categories?.message} />
          </Field>
        </div>

        <Field label="보안여부" required info="극비는 지정한 사람만, 보안은 법무팀과 관계자만 볼 수 있어요.">
          <Controller name="security" control={control} render={({ field }) => (
            <ButtonGroup
              variant="outline"
              value={field.value}
              onChange={field.onChange}
              items={SECURITY_LEVELS.map((level) => ({ value: level.value, label: level.label }))}
            />
          )} />
        </Field>

        <Field label="자문요청자" required>
          <Controller name="requester" control={control} render={({ field }) => (
            <EntityAutoComplete
              queryKey="adviceRequester"
              fetcher={searchUsers}
              placeholder="이름으로 검색"
              value={field.value ? [field.value] : []}
              onChange={(entries) => field.onChange(entries[0] ?? null)}
            />
          )} />
          <ErrText msg={errors.requester?.message} />
        </Field>

        <div className={css.full}>
          <Field label="관련자료 첨부" info="질의와 함께 볼 자료를 올립니다.">
            <FileUploadArea
              variant="basic"
              description="파일을 여기에 드래그하거나 버튼을 클릭해 선택하세요."
              onFilesAdded={(added: File[]) =>
                setFiles((prev) => [...prev, ...added.map((f) => ({ name: f.name, meta: formatFileMeta(f) }))])
              }
            >
              {files.length > 0 && (
                <div className={css.fileList}>
                  {files.map((file, index) => (
                    <FileItem
                      key={`${file.name}-${index}`}
                      filename={file.name}
                      fileMeta={file.meta}
                      onDelete={() => setFiles((prev) => prev.filter((_, i) => i !== index))}
                    />
                  ))}
                </div>
              )}
            </FileUploadArea>
          </Field>
        </div>

        <Field label="참조수신자" info="진행 상황을 공유받을 참조 대상자입니다.">
          <Controller name="ccUsers" control={control} render={({ field }) => (
            <EntityAutoComplete queryKey="adviceCcUsers" fetcher={searchUsers} multiple
              placeholder="이름으로 검색" value={field.value} onChange={field.onChange} />
          )} />
        </Field>

        <Field label="참조수신자(부서)" info="진행 상황을 공유받을 부서를 선택합니다.">
          <Controller name="ccDepts" control={control} render={({ field }) => (
            <EntityAutoComplete queryKey="adviceCcDepts" fetcher={searchDepartments} multiple
              placeholder="부서명으로 검색" value={field.value} onChange={field.onChange} />
          )} />
        </Field>

        <Field label="참조수신자(비밀)" info="다른 참조자에게는 보이지 않는 참조 대상자입니다.">
          <Controller name="ccSecret" control={control} render={({ field }) => (
            <EntityAutoComplete queryKey="adviceCcSecret" fetcher={searchUsers} multiple
              placeholder="이름으로 검색" value={field.value} onChange={field.onChange} />
          )} />
        </Field>

        <Field label="업무담당자" info="자문을 맡아 회신할 법무 담당자입니다.">
          <Controller name="owner" control={control} render={({ field }) => (
            <EntityAutoComplete queryKey="adviceOwner" fetcher={searchUsers}
              placeholder="이름으로 검색" value={field.value ? [field.value] : []}
              onChange={(entries) => field.onChange(entries[0] ?? null)} />
          )} />
        </Field>

        <Field label="관련 프로젝트">
          <Controller name="project" control={control} render={({ field }) => (
            <EntityAutoComplete queryKey="adviceProject" fetcher={searchProjects}
              placeholder="프로젝트명으로 검색" value={field.value ? [field.value] : []}
              onChange={(entries) => field.onChange(entries[0] ?? null)} />
          )} />
        </Field>

        <Field label="상대 계약자 정보" info="자문 대상이 되는 거래 상대방입니다.">
          <div className={css.btnRow}>
            <Controller name="counterparty" control={control} render={({ field }) => (
              <div style={{ flex: 1, minWidth: 0 }}>
                <Input inputSize="medium" placeholder="회사명" value={field.value} onChange={field.onChange} />
              </div>
            )} />
            <Button type="button" variant="outline" color="secondary">신규 추가</Button>
          </div>
        </Field>
      </div>
    </Card>
  );
}
