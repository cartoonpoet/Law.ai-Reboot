import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Modal, Button } from "@lawkit/ui";
import { getTemplate } from "../../../api/documentTemplates";
import { exportDocument, base64ToDocxFile } from "../../../api/documents";
import { htmlToTiptapJson, tiptapJsonToHtml } from "../../../components/documentEditor/tiptapContent";
import { RichTextEditor } from "../../../components/ui/RichTextEditor";
import { ErrText } from "./_shared";

interface StandardFormEditorModalProps {
  templateId: string;
  templateName: string;
  onClose: () => void;
  // 편집 모드(contractId 있음)는 완료 시 즉시 업로드까지 끝내고 resolve — 그 전까지 모달이 닫히지 않아야
  // 계약서 폼 저장이 방금 올라간 첨부를 덮어쓰는 경합이 생기지 않는다.
  onComplete: (file: File) => Promise<void>;
}

/** 표준계약서 체결 — 고른 양식의 최신 버전으로 편집기를 열고, 완료하면 진짜 .docx를 만들어 넘긴다. */
export const StandardFormEditorModal = ({ templateId, templateName, onClose, onComplete }: StandardFormEditorModalProps) => {
  const [content, setContent] = useState<string | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const query = useQuery({ queryKey: ["documentTemplate", templateId], queryFn: () => getTemplate(templateId) });
  if (query.data && content === null) setContent(tiptapJsonToHtml(query.data.currentVersion.content));

  const handleComplete = async () => {
    if (content === null) return;
    setIsFinishing(true);
    setError(null);
    try {
      const res = await exportDocument(htmlToTiptapJson(content), templateName);
      await onComplete(base64ToDocxFile(res));
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "계약서를 만들지 못했습니다");
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
      {error && <ErrText msg={error} />}
      {query.isLoading && <p>불러오는 중…</p>}
      {query.isError && <p>양식을 불러오지 못했습니다.</p>}
      {content !== null && <RichTextEditor ariaLabel="계약서 작성" value={content} onChange={setContent} withTable withFullToolbar />}
    </Modal>
  );
};
