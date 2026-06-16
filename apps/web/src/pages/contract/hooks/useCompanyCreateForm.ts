import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Company, CreateCompanyRequest } from "@lawai/contracts";
import { createCompany } from "../../../api/companies";
import { openAddressSearch } from "../daumPostcode";

// 신규 회사 등록 폼 — 다필드 + 검증이므로 react-hook-form + zod(폼 처리 3단계 규칙).
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export const companyCreateSchema = z.object({
  type: z.enum(["company", "individual"]),
  name: z.string().trim().min(1, "회사명을 입력하세요"),
  bizNo: z.string().trim().optional(),
  ceo: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
  addressDetail: z.string().trim().optional(),
  managerName: z.string().trim().optional(),
  managerPhone: z.string().trim().optional(),
  managerEmail: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || EMAIL_RE.test(v), "올바른 이메일 형식이 아닙니다"),
});

export type CompanyCreateFormValues = z.infer<typeof companyCreateSchema>;

const toRequest = (v: CompanyCreateFormValues): CreateCompanyRequest => ({
  type: v.type,
  name: v.name,
  bizNo: v.bizNo || undefined,
  ceo: v.ceo || undefined,
  phone: v.phone || undefined,
  address: v.address || undefined,
  addressDetail: v.addressDetail || undefined,
  managerName: v.managerName || undefined,
  managerPhone: v.managerPhone || undefined,
  managerEmail: v.managerEmail || undefined,
});

interface UseCompanyCreateFormArgs {
  initialName?: string;
  onCreated: (company: Company) => void;
  onClose: () => void;
}

export const useCompanyCreateForm = ({
  initialName = "",
  onCreated,
  onClose,
}: UseCompanyCreateFormArgs) => {
  const {
    control,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CompanyCreateFormValues>({
    resolver: zodResolver(companyCreateSchema),
    defaultValues: {
      type: "company",
      name: initialName,
      bizNo: "",
      ceo: "",
      phone: "",
      address: "",
      addressDetail: "",
      managerName: "",
      managerPhone: "",
      managerEmail: "",
    },
  });

  const submit = handleSubmit(async (values) => {
    try {
      const created = await createCompany(toRequest(values));
      onCreated(created);
      onClose();
    } catch (e) {
      setError("root", {
        message: e instanceof Error ? e.message : "등록에 실패했습니다",
      });
    }
  });

  const findAddress = () => {
    openAddressSearch((roadAddress) => setValue("address", roadAddress)).catch((e) =>
      setError("root", {
        message: e instanceof Error ? e.message : "주소 검색을 열 수 없습니다",
      }),
    );
  };

  return { control, errors, isSubmitting, submit, findAddress };
};
