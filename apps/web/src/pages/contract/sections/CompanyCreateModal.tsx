import { Controller } from "react-hook-form";
import { Modal, Input, RadioGroup, Radio, Button } from "@lawkit/ui";
import type { Company } from "@lawai/contracts";
import { Field, ErrText } from "./_shared";
import { useCompanyCreateForm } from "../hooks/useCompanyCreateForm";

interface CompanyCreateModalProps {
  initialName?: string;
  onClose: () => void;
  onCreated: (company: Company) => void;
}

// 표시 여부는 부모가 "마운트 여부"로 선언적으로 제어한다(열렸을 때만 렌더).
// 매번 새 인스턴스로 마운트되어 입력 상태가 자동 초기화된다.
export function CompanyCreateModal({
  initialName,
  onClose,
  onCreated,
}: CompanyCreateModalProps) {
  const { control, errors, isSubmitting, submit, findAddress } = useCompanyCreateForm({
    initialName,
    onCreated,
    onClose,
  });

  return (
    <Modal
      open
      onClose={onClose}
      size="medium"
      title="상대 계약자 신규 등록"
      footer={
        <>
          <Button type="button" variant="outline" color="secondary" onClick={onClose}>
            취소
          </Button>
          <Button type="button" onClick={submit} disabled={isSubmitting}>
            등록하고 선택
          </Button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="구분">
          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <RadioGroup value={field.value} onChange={field.onChange}>
                <Radio value="company" label="회사(법인)" />
                <Radio value="individual" label="개인(개인사업자)" />
              </RadioGroup>
            )}
          />
        </Field>
        <Field label="회사명 / 상호" required>
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <Input placeholder="예) 삼성전자(주)" value={field.value} onChange={field.onChange} />
            )}
          />
          <ErrText msg={errors.name?.message} />
        </Field>
        <Field label="사업자등록번호">
          <Controller
            name="bizNo"
            control={control}
            render={({ field }) => (
              <Input
                placeholder="000-00-00000 (미부여 시 비워두면 임시번호 자동 생성)"
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="대표자명">
            <Controller
              name="ceo"
              control={control}
              render={({ field }) => <Input value={field.value} onChange={field.onChange} />}
            />
          </Field>
          <Field label="대표 전화">
            <Controller
              name="phone"
              control={control}
              render={({ field }) => (
                <Input placeholder="02-0000-0000" value={field.value} onChange={field.onChange} />
              )}
            />
          </Field>
        </div>
        <Field label="주소">
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <Controller
                name="address"
                control={control}
                render={({ field }) => (
                  <Input
                    placeholder="주소 찾기로 검색하세요"
                    value={field.value}
                    readOnly
                    onClick={findAddress}
                  />
                )}
              />
            </div>
            <Button type="button" variant="outline" color="secondary" onClick={findAddress}>
              주소 찾기
            </Button>
          </div>
        </Field>
        <Field label="상세주소">
          <Controller
            name="addressDetail"
            control={control}
            render={({ field }) => (
              <Input placeholder="동·호수 등" value={field.value} onChange={field.onChange} />
            )}
          />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="담당자명">
            <Controller
              name="managerName"
              control={control}
              render={({ field }) => <Input value={field.value} onChange={field.onChange} />}
            />
          </Field>
          <Field label="담당자 연락처">
            <Controller
              name="managerPhone"
              control={control}
              render={({ field }) => (
                <Input placeholder="010-0000-0000" value={field.value} onChange={field.onChange} />
              )}
            />
          </Field>
        </div>
        <Field label="담당자 이메일">
          <Controller
            name="managerEmail"
            control={control}
            render={({ field }) => (
              <Input placeholder="name@company.com" value={field.value} onChange={field.onChange} />
            )}
          />
          <ErrText msg={errors.managerEmail?.message} />
        </Field>
        <ErrText msg={errors.root?.message} />
      </div>
    </Modal>
  );
}
