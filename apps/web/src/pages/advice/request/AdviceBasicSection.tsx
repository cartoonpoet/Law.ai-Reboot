import { Controller, useFormContext } from "react-hook-form";
import { ButtonGroup, Card, Checkbox, FileItem, FileUploadArea, Input } from "@lawkit/ui";
import { searchDepartments, searchProjects, searchUsers } from "../../../api/directory";
import { formatFileMeta } from "../../contract/fileMeta";
import { CardTitle, ErrText, Field } from "../../contract/sections/_shared";
import { EntityAutoComplete } from "../../contract/sections/EntityAutoComplete";
import { ADVICE_CATEGORIES, SECURITY_LEVEL_OPTIONS } from "../adviceMeta";
import type { AdviceRequestFormTypes } from "./adviceRequestSchema";
import * as formCss from "../../contract/contractRequest.css";

/** 기본정보 — 자문명 · 분류 · 보안 · 요청자 · 참조 · 담당 · 관련 항목. */
export const AdviceBasicSection = () => {
  const {
    control,
    formState: { errors },
  } = useFormContext<AdviceRequestFormTypes>();

  return (
    <Card bordered header={<CardTitle num={1}>기본정보</CardTitle>}>
      <div className={formCss.grid2}>
        <div className={formCss.full}>
          <Field label="자문명" required>
            <Controller
              name="title"
              control={control}
              render={({ field }) => (
                <Input inputSize="medium" placeholder="자문명을 입력해 주세요" value={field.value} onChange={field.onChange} />
              )}
            />
            <ErrText msg={errors.title?.message} />
          </Field>
        </div>

        <div className={formCss.full}>
          <Field label="자문분류(내용)" required info="자문 내용에 해당하는 분야를 모두 고릅니다.">
            <Controller
              name="categories"
              control={control}
              render={({ field }) => (
                <div className={formCss.grid4}>
                  {ADVICE_CATEGORIES.map((name) => (
                    <Checkbox
                      key={name}
                      label={name}
                      checked={field.value.includes(name)}
                      onCheckedChange={(isChecked) =>
                        field.onChange(isChecked ? [...field.value, name] : field.value.filter((value) => value !== name))
                      }
                    />
                  ))}
                </div>
              )}
            />
            <ErrText msg={errors.categories?.message} />
          </Field>
        </div>

        <Field label="보안여부" required info="극비·보안 자문은 법무팀과 요청 관계자만 볼 수 있어요.">
          <Controller
            name="securityLevel"
            control={control}
            render={({ field }) => (
              <ButtonGroup variant="outline" value={field.value} onChange={field.onChange} items={SECURITY_LEVEL_OPTIONS} />
            )}
          />
        </Field>

        <Field label="자문요청자" required>
          <Controller
            name="requester"
            control={control}
            render={({ field }) => (
              <EntityAutoComplete
                queryKey="adviceRequester"
                fetcher={searchUsers}
                placeholder="이름으로 검색"
                value={field.value ? [field.value] : []}
                onChange={(entries) => field.onChange(entries[0] ?? null)}
              />
            )}
          />
          <ErrText msg={errors.requester?.message} />
        </Field>

        <div className={formCss.full}>
          <Field label="관련자료 첨부" info="질의와 함께 볼 자료입니다. 요청한 뒤 상세 화면에서도 올릴 수 있어요.">
            <Controller
              name="files"
              control={control}
              render={({ field }) => (
                <FileUploadArea
                  variant="basic"
                  description="파일을 여기에 놓거나 버튼으로 고르세요."
                  onFilesAdded={(added: File[]) => field.onChange([...field.value, ...added])}
                >
                  {field.value.length > 0 && (
                    <div className={formCss.fileList}>
                      {field.value.map((file, index) => (
                        <FileItem
                          key={`${file.name}-${index}`}
                          filename={file.name}
                          fileMeta={formatFileMeta(file)}
                          onDelete={() =>
                            field.onChange(field.value.filter((_, fileIndex) => fileIndex !== index))
                          }
                        />
                      ))}
                    </div>
                  )}
                </FileUploadArea>
              )}
            />
          </Field>
        </div>

        <Field label="참조수신자" info="진행 상황을 공유받고 자문을 열람할 수 있는 사람입니다.">
          <Controller
            name="ccUsers"
            control={control}
            render={({ field }) => (
              <EntityAutoComplete
                queryKey="adviceCcUsers"
                fetcher={searchUsers}
                multiple
                placeholder="이름으로 검색"
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </Field>

        <Field label="참조수신자(부서)" info="진행 상황을 공유받을 부서를 선택합니다.">
          <Controller
            name="ccDepts"
            control={control}
            render={({ field }) => (
              <EntityAutoComplete
                queryKey="adviceCcDepts"
                fetcher={searchDepartments}
                multiple
                placeholder="부서명으로 검색"
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </Field>

        <Field label="참조수신자(비밀)" info="법무팀과 작성자만 볼 수 있는 참조 대상자입니다.">
          <Controller
            name="ccSecret"
            control={control}
            render={({ field }) => (
              <EntityAutoComplete
                queryKey="adviceCcSecret"
                fetcher={searchUsers}
                multiple
                placeholder="이름으로 검색"
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </Field>

        <Field label="업무담당자" info="법무팀 담당자를 알면 지정하세요. 지정하면 바로 검토가 시작되고, 비우면 법무팀이 배정합니다.">
          <Controller
            name="owner"
            control={control}
            render={({ field }) => (
              <EntityAutoComplete
                queryKey="adviceOwner"
                fetcher={searchUsers}
                placeholder="이름으로 검색"
                value={field.value ? [field.value] : []}
                onChange={(entries) => field.onChange(entries[0] ?? null)}
              />
            )}
          />
        </Field>

        <Field label="관련 프로젝트">
          <Controller
            name="project"
            control={control}
            render={({ field }) => (
              <EntityAutoComplete
                queryKey="adviceProject"
                fetcher={searchProjects}
                placeholder="프로젝트명으로 검색"
                value={field.value ? [field.value] : []}
                onChange={(entries) => field.onChange(entries[0] ?? null)}
              />
            )}
          />
        </Field>

        <Field label="상대방" info="자문 대상이 되는 거래 상대방 회사명입니다.">
          <Controller
            name="counterparty"
            control={control}
            render={({ field }) => (
              <Input inputSize="medium" placeholder="회사명" value={field.value} onChange={field.onChange} />
            )}
          />
        </Field>
      </div>
    </Card>
  );
};
