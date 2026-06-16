import { useState } from "react";
import { Modal, Input, RadioGroup, Radio, Button } from "@lawkit/ui";
import type { Company, CompanyType, CreateCompanyRequest } from "@lawai/contracts";
import { createCompany } from "../../../api/companies";
import { Field, ErrText } from "./_shared";

// Daum(카카오) 우편번호 서비스 — 무료, API 키 불필요. 클릭 시 스크립트를 1회 로드해 팝업을 띄운다.
interface DaumPostcodeData {
  roadAddress: string;
  jibunAddress: string;
  zonecode: string;
}
interface DaumPostcodeInstance {
  open: () => void;
}
declare global {
  interface Window {
    daum?: {
      Postcode: new (options: {
        oncomplete: (data: DaumPostcodeData) => void;
      }) => DaumPostcodeInstance;
    };
  }
}

const DAUM_POSTCODE_SRC =
  "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
let daumPostcodePromise: Promise<void> | null = null;
const loadDaumPostcode = (): Promise<void> => {
  if (window.daum?.Postcode) return Promise.resolve();
  if (daumPostcodePromise) return daumPostcodePromise;
  daumPostcodePromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = DAUM_POSTCODE_SRC;
    script.onload = () => resolve();
    script.onerror = () => {
      daumPostcodePromise = null;
      reject(new Error("주소 검색 서비스를 불러오지 못했습니다"));
    };
    document.head.appendChild(script);
  });
  return daumPostcodePromise;
};

interface CompanyCreateModalProps {
  initialName?: string;
  onClose: () => void;
  onCreated: (company: Company) => void;
}

// 표시 여부는 부모가 "마운트 여부"로 선언적으로 제어한다(열렸을 때만 렌더).
// 그래서 매번 새 인스턴스로 마운트되어 입력 상태가 자동 초기화된다(수동 reset 불필요).
export function CompanyCreateModal({
  initialName = "",
  onClose,
  onCreated,
}: CompanyCreateModalProps) {
  const [type, setType] = useState<CompanyType>("company");
  const [name, setName] = useState(initialName);
  const [bizNo, setBizNo] = useState("");
  const [ceo, setCeo] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [managerName, setManagerName] = useState("");
  const [managerPhone, setManagerPhone] = useState("");
  const [managerEmail, setManagerEmail] = useState("");
  const [nameError, setNameError] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setNameError("회사명을 입력하세요");
      return;
    }
    setNameError("");
    setSubmitting(true);
    setError("");
    const req: CreateCompanyRequest = {
      type,
      name: name.trim(),
      bizNo: bizNo.trim() || undefined,
      ceo: ceo.trim() || undefined,
      phone: phone.trim() || undefined,
      address: address.trim() || undefined,
      addressDetail: addressDetail.trim() || undefined,
      managerName: managerName.trim() || undefined,
      managerPhone: managerPhone.trim() || undefined,
      managerEmail: managerEmail.trim() || undefined,
    };
    try {
      const created = await createCompany(req);
      onCreated(created);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "등록에 실패했습니다");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFindAddress = async () => {
    try {
      await loadDaumPostcode();
      new window.daum!.Postcode({
        oncomplete: (data) => {
          setAddress(data.roadAddress || data.jibunAddress);
        },
      }).open();
    } catch (e) {
      setError(e instanceof Error ? e.message : "주소 검색을 열 수 없습니다");
    }
  };

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
          <Button type="button" onClick={handleSubmit} disabled={submitting}>
            등록하고 선택
          </Button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="구분">
          {/* v는 아래 Radio children 값(company|individual)만 방출하므로 캐스트 안전 */}
          <RadioGroup value={type} onChange={(v) => setType(v as CompanyType)}>
            <Radio value="company" label="회사(법인)" />
            <Radio value="individual" label="개인(개인사업자)" />
          </RadioGroup>
        </Field>
        <Field label="회사명 / 상호" required>
          <Input
            placeholder="예) 삼성전자(주)"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (nameError) setNameError("");
            }}
          />
          <ErrText msg={nameError} />
        </Field>
        <Field label="사업자등록번호">
          <Input
            placeholder="000-00-00000 (미부여 시 비워두면 임시번호 자동 생성)"
            value={bizNo}
            onChange={(e) => setBizNo(e.target.value)}
          />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="대표자명">
            <Input value={ceo} onChange={(e) => setCeo(e.target.value)} />
          </Field>
          <Field label="대표 전화">
            <Input
              placeholder="02-0000-0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </Field>
        </div>
        <Field label="주소">
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <Input
                placeholder="주소 찾기로 검색하세요"
                value={address}
                readOnly
                onClick={handleFindAddress}
              />
            </div>
            <Button type="button" variant="outline" color="secondary" onClick={handleFindAddress}>
              주소 찾기
            </Button>
          </div>
        </Field>
        <Field label="상세주소">
          <Input
            placeholder="동·호수 등"
            value={addressDetail}
            onChange={(e) => setAddressDetail(e.target.value)}
          />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="담당자명">
            <Input value={managerName} onChange={(e) => setManagerName(e.target.value)} />
          </Field>
          <Field label="담당자 연락처">
            <Input
              placeholder="010-0000-0000"
              value={managerPhone}
              onChange={(e) => setManagerPhone(e.target.value)}
            />
          </Field>
        </div>
        <Field label="담당자 이메일">
          <Input
            placeholder="name@company.com"
            value={managerEmail}
            onChange={(e) => setManagerEmail(e.target.value)}
          />
        </Field>
        <ErrText msg={error} />
      </div>
    </Modal>
  );
}
