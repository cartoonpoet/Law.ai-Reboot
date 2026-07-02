import { useState } from "react";
import type { FileAttachmentDto } from "@lawai/contracts";
import { confirmFile, presignFile } from "../../../api/files";
import { validateClientFile } from "../utils/fileLimits";

export type AttachmentStatus =
  | "pending"
  | "uploading"
  | "done"
  | "error";

export interface AttachmentState {
  // 로컬 식별자(업로드 진행 중 식별용 — 서버 id 는 done 단계에서 확정).
  localId: string;
  name: string;
  size: number;
  status: AttachmentStatus;
  reason?: string;
  // confirm 성공 시 서버 FileAttachmentDto.
  attachment?: FileAttachmentDto;
}

// SubtleCrypto SHA-256 → hex.
const sha256Hex = async (file: File): Promise<string> => {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

// 작은 ID 생성기(crypto.randomUUID 가 있는 환경에서만 보장).
const newLocalId = (): string =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `loc-${Math.random().toString(36).slice(2)}`;

interface UseFileUploadOptions {
  contractId: string;
  // 기존에 이미 업로드(confirm)된 첨부를 초기 상태로 시드한다(코멘트 수정 모드 진입 시).
  // useState 초기값으로만 사용 — 이후 변경은 무시(편집 세션 중에는 사용자 액션이 정답).
  initialAttachments?: FileAttachmentDto[];
}

interface UseFileUploadReturn {
  attachments: AttachmentState[];
  addFiles: (files: File[]) => Promise<void>;
  removeAttachment: (localId: string) => void;
  getReadyIds: () => string[];
  reset: () => void;
  hasPending: boolean;
}

// FileAttachmentDto → 'done' 상태의 AttachmentState 로 시드.
const seedFromAttachments = (
  initial?: FileAttachmentDto[],
): AttachmentState[] =>
  (initial ?? []).map((att) => ({
    localId: `seed-${att.id}`,
    name: att.name,
    size: att.size,
    status: "done" as const,
    attachment: att,
  }));

/**
 * 코멘트 첨부 업로드 훅 — presign → PUT → confirm 의 3단계 흐름을 상태 기반으로 관리.
 *
 * - useEffect 0(선언식): 진행률은 fetch 의 await 흐름 + setState 로만 표현.
 * - 실패는 상태(status:'error')로 노출. 성공 시 attachment(FileAttachmentDto) 보관.
 * - 코멘트 등록 시 getReadyIds()로 status==='done' 항목의 attachment.id 만 전달.
 */
export const useFileUpload = ({
  contractId,
  initialAttachments,
}: UseFileUploadOptions): UseFileUploadReturn => {
  const [attachments, setAttachments] = useState<AttachmentState[]>(() =>
    seedFromAttachments(initialAttachments),
  );

  const updateOne = (
    localId: string,
    patch: Partial<AttachmentState>,
  ): void => {
    setAttachments((prev) =>
      prev.map((a) => (a.localId === localId ? { ...a, ...patch } : a)),
    );
  };

  const uploadOne = async (
    localId: string,
    file: File,
  ): Promise<void> => {
    try {
      updateOne(localId, { status: "uploading" });
      const sha256 = await sha256Hex(file);
      const presign = await presignFile({
        contractId,
        fileName: file.name,
        size: file.size,
        mimeType: file.type,
        sha256,
      });
      const putRes = await fetch(presign.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!putRes.ok) {
        throw new Error(`업로드 실패 (${putRes.status})`);
      }
      const etag =
        putRes.headers.get("etag")?.replace(/^"|"$/g, "") || sha256;
      const attachment = await confirmFile({
        uploadToken: presign.uploadToken,
        etag,
      });
      updateOne(localId, { status: "done", attachment });
    } catch (err) {
      updateOne(localId, {
        status: "error",
        reason: err instanceof Error ? err.message : "업로드 실패",
      });
    }
  };

  const addFiles = async (files: File[]): Promise<void> => {
    // 클라이언트 검증 후 currentCount + 추가될 칸 수 누적 검증.
    const queued: { localId: string; file: File }[] = [];
    setAttachments((prev) => {
      const next: AttachmentState[] = [...prev];
      for (const file of files) {
        const check = validateClientFile(file, next.length);
        if (!check.ok) {
          next.push({
            localId: newLocalId(),
            name: file.name,
            size: file.size,
            status: "error",
            reason: check.reason,
          });
          continue;
        }
        const localId = newLocalId();
        next.push({
          localId,
          name: file.name,
          size: file.size,
          status: "pending",
        });
        queued.push({ localId, file });
      }
      return next;
    });
    // 업로드는 순차 — 단순성. 병렬이 필요해지면 Promise.all 로 교체.
    for (const item of queued) {
      await uploadOne(item.localId, item.file);
    }
  };

  const removeAttachment = (localId: string): void => {
    setAttachments((prev) => prev.filter((a) => a.localId !== localId));
  };

  const getReadyIds = (): string[] =>
    attachments
      .filter((a) => a.status === "done" && a.attachment)
      .map((a) => a.attachment!.id);

  const reset = (): void => setAttachments([]);

  const hasPending = attachments.some(
    (a) => a.status === "pending" || a.status === "uploading",
  );

  return {
    attachments,
    addFiles,
    removeAttachment,
    getReadyIds,
    reset,
    hasPending,
  };
};
