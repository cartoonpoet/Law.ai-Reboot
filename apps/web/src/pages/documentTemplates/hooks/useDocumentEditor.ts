import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getTemplate, createTemplateVersion, listTemplateVersions, revertTemplateVersion } from "../../../api/documentTemplates";
import { requestAiDraft, requestAiRewrite, requestAiReview } from "../../../api/documents";
import { htmlToTiptapJson, tiptapJsonToHtml } from "../../../components/documentEditor/tiptapContent";
import type { AiReviewFinding } from "@lawai/contracts";

/** 표준양식 편집기 — 템플릿 조회·저장(새 버전)·버전 이력·되돌리기·AI 3종을 한 훅으로 묶는다. */
export const useDocumentEditor = (templateId: string, initialHtml?: string) => {
  const queryClient = useQueryClient();
  const [content, setContent] = useState<string | null>(initialHtml ?? null);
  const [isSaving, setIsSaving] = useState(false);
  const [isVersionOpen, setIsVersionOpen] = useState(false);
  const [reviewFindings, setReviewFindings] = useState<AiReviewFinding[]>([]);
  const [isReviewing, setIsReviewing] = useState(false);

  const templateQuery = useQuery({
    queryKey: ["documentTemplate", templateId],
    queryFn: () => getTemplate(templateId),
  });

  // 서버에서 막 받아온 최신 버전을 로컬 content(HTML)로 한 번만 반영한다(그 뒤로는 편집기가 정본).
  const template = templateQuery.data;
  if (template && content === null) {
    setContent(tiptapJsonToHtml(template.currentVersion.content));
  }

  const versionsQuery = useQuery({
    queryKey: ["documentTemplateVersions", templateId],
    queryFn: () => listTemplateVersions(templateId),
    enabled: isVersionOpen,
  });

  const save = async (): Promise<void> => {
    if (content === null) return;
    setIsSaving(true);
    try {
      await createTemplateVersion(templateId, { content: htmlToTiptapJson(content), clauseCount: null });
      await queryClient.invalidateQueries({ queryKey: ["documentTemplate", templateId] });
      await queryClient.invalidateQueries({ queryKey: ["documentTemplateVersions", templateId] });
    } finally {
      setIsSaving(false);
    }
  };

  const revert = async (versionNo: number): Promise<void> => {
    await revertTemplateVersion(templateId, versionNo);
    await queryClient.invalidateQueries({ queryKey: ["documentTemplate", templateId] });
    await queryClient.invalidateQueries({ queryKey: ["documentTemplateVersions", templateId] });
    setContent(null); // 다음 렌더에서 최신 버전으로 다시 채운다
    setIsVersionOpen(false);
  };

  const generateDraft = async (request: string): Promise<string> => {
    const res = await requestAiDraft(request);
    if (res.needsSetup) throw new Error("AI 연동을 먼저 설정해 주세요(시스템 관리 화면).");
    return res.html;
  };

  const rewriteSelection = async (selectedText: string, instruction: string): Promise<string> => {
    const res = await requestAiRewrite(selectedText, instruction);
    if (res.needsSetup) throw new Error("AI 연동을 먼저 설정해 주세요(시스템 관리 화면).");
    return res.rewrittenText;
  };

  const runReview = async (): Promise<void> => {
    if (content === null) return;
    setIsReviewing(true);
    try {
      const res = await requestAiReview(content);
      setReviewFindings(res.findings);
    } finally {
      setIsReviewing(false);
    }
  };

  return {
    template,
    isLoading: templateQuery.isLoading,
    isError: templateQuery.isError,
    content: content ?? "",
    setContent,
    save,
    isSaving,
    versions: versionsQuery.data?.versions ?? [],
    isVersionOpen,
    openVersions: () => setIsVersionOpen(true),
    closeVersions: () => setIsVersionOpen(false),
    revert,
    generateDraft,
    rewriteSelection,
    runReview,
    reviewFindings,
    isReviewing,
  };
};
