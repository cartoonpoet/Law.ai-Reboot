import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Modal, Input, InputGroup, Dropdown, Button } from "@lawkit/ui";
import type { TemplateCategoryTypes } from "@lawai/contracts";
import { createTemplate } from "../../api/documentTemplates";
import { STANDARD_FORM_CATEGORIES } from "../../api/standardForms";
import * as css from "./documentTemplates.css";

const EMPTY_DOC = { type: "doc", content: [{ type: "paragraph" }] };

interface CreateTemplateModalProps {
  onClose: () => void;
  // DOCX 업로드로 시작하면 mammoth 로 변환된 초기 HTML(빈 문서면 undefined) — 저장은 편집기 화면에서
  // HTML→Tiptap JSON 변환 후 이뤄지므로, 여기서는 "빈 문서 뼈대"로만 만들고 편집기 진입 뒤 즉시 첫 저장한다.
  initialHtml?: string;
}

/** 표준양식 이름·분류를 받아 템플릿을 만들고 편집기로 이동한다. */
export const CreateTemplateModal = ({ onClose, initialHtml }: CreateTemplateModalProps) => {
  const navigate = useNavigate();
  const [categoryId, setCategoryId] = useState<TemplateCategoryTypes>("nda");
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (name.trim() === "") return;
    setIsSaving(true);
    setError(null);
    try {
      const res = await createTemplate({ categoryId, name: name.trim(), content: EMPTY_DOC });
      // DOCX 업로드로 시작한 경우 들여온 HTML을 편집기 초기값으로 넘긴다(편집기가 JSON 변환 후 첫 저장을 한다).
      navigate(`/document-templates/${res.template.id}`, { state: initialHtml ? { initialHtml } : undefined });
    } catch (err) {
      setError(err instanceof Error ? err.message : "양식을 만들지 못했습니다");
      setIsSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="새 표준양식 만들기"
      footer={
        <>
          <Button variant="outline" color="secondary" onClick={onClose}>
            취소
          </Button>
          <Button disabled={name.trim() === "" || isSaving} onClick={handleCreate}>
            {isSaving ? "만드는 중…" : "만들고 편집하기"}
          </Button>
        </>
      }
    >
      {error && <p className={css.errorText}>{error}</p>}
      <InputGroup label="분류">
        <Dropdown
          value={categoryId}
          onChange={(next) => setCategoryId(next as TemplateCategoryTypes)}
          options={STANDARD_FORM_CATEGORIES.map((c) => ({ value: c.id, label: c.label }))}
        />
      </InputGroup>
      <InputGroup label="양식 이름">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="예) 비밀유지계약서(NDA) 표준" />
      </InputGroup>
    </Modal>
  );
};
