import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Modal, Button } from "@lawkit/ui";
import { getTemplate } from "../../../api/documentTemplates";
import { exportDocument, base64ToDocxFile } from "../../../api/documents";
import { htmlToTiptapJson, tiptapJsonToHtml } from "../../../components/documentEditor/tiptapContent";
import { RichTextEditor } from "../../../components/ui/RichTextEditor";

interface StandardFormEditorModalProps {
  templateId: string;
  templateName: string;
  onClose: () => void;
  onComplete: (file: File) => void;
}

/** 표준계약서 체결 — 고른 양식의 최신 버전으로 편집기를 열고, 완료하면 진짜 .docx를 만들어 넘긴다. */
export const StandardFormEditorModal = ({ templateId, templateName, onClose, onComplete }: StandardFormEditorModalProps) => {
  const [content, setContent] = useState<string | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);

  const query = useQuery({ queryKey: ["documentTemplate", templateId], queryFn: () => getTemplate(templateId) });
  if (query.data && content === null) setContent(tiptapJsonToHtml(query.data.currentVersion.content));

  const handleComplete = async () => {
    if (content === null) return;
    setIsFinishing(true);
    try {
      const res = await exportDocument(htmlToTiptapJson(content), templateName);
      onComplete(base64ToDocxFile(res));
      onClose();
    } finally {
      setIsFinishing(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="xlarge"
      title={`${templateName} — 계약서 작성`}
      footer={
        <>
          <Button variant="outline" color="secondary" onClick={onClose}>
            취소
          </Button>
          <Button disabled={content === null || isFinishing} onClick={() => void handleComplete()}>
            {isFinishing ? "만드는 중…" : "이 내용으로 계약서 첨부"}
          </Button>
        </>
      }
    >
      {query.isLoading && <p>불러오는 중…</p>}
      {content !== null && <RichTextEditor ariaLabel="계약서 작성" value={content} onChange={setContent} withTable withFullToolbar />}
    </Modal>
  );
};
