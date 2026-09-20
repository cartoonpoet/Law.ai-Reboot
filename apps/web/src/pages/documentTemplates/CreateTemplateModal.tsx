import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Modal, Input, InputGroup, Dropdown, Button } from "@lawkit/ui";
import type { TemplateCategoryTypes } from "@lawai/contracts";
import { createTemplate } from "../../api/documentTemplates";
import { STANDARD_FORM_CATEGORIES } from "../../api/standardForms";
import { htmlToTiptapJson } from "../../components/documentEditor/tiptapContent";
import * as css from "./documentTemplates.css";

const EMPTY_DOC = { type: "doc", content: [{ type: "paragraph" }] };

interface CreateTemplateModalProps {
  onClose: () => void;
  // DOCX 업로드로 시작하면 mammoth 로 변환된 초기 HTML(빈 문서면 undefined). 여기서 바로
  // Tiptap JSON으로 변환해 템플릿 생성 요청(v1)에 실어 보낸다 — 그래야 사용자가 편집기에서
  // 저장 버튼을 누르기 전에도(예: 올리자마자 나가는 경우) 들여온 내용이 유실되지 않는다.
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
      const content = initialHtml ? htmlToTiptapJson(initialHtml) : EMPTY_DOC;
      const res = await createTemplate({ categoryId, name: name.trim(), content });
      navigate(`/document-templates/${res.template.id}`);
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
