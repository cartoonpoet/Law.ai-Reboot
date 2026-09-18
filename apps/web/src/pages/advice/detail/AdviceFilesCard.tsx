import { Button, FileItem, FileUploadArea, Icon } from "@lawkit/ui";
import type { AdviceResponse } from "@lawai/contracts";
import { formatBytes } from "../../contract/fileMeta";
import { useAdviceFiles } from "../hooks/useAdviceFiles";
import * as base from "../../contract/contractDetail.css";
import * as css from "./adviceDetail.css";

// "PDF · 1.2 MB" — 파일 이름의 확장자와 크기.
const toFileMeta = (name: string, size: number): string => {
  const extension = name.includes(".") ? name.split(".").pop()!.toUpperCase() : "FILE";
  return `${extension} · ${formatBytes(size)}`;
};

interface AdviceFilesCardProps {
  advice: AdviceResponse;
  canUpload: boolean;
}

/** 첨부 — 요청·검토 과정에서 올린 파일. 자문에 관여한 사람은 올리고 내려받을 수 있다. */
export const AdviceFilesCard = ({ advice, canUpload }: AdviceFilesCardProps) => {
  const { uploadFiles, isUploading, uploadError, openFile, isOpening } = useAdviceFiles(advice.id);

  return (
    <section className={base.card}>
      <header className={base.chead}>
        <Icon name="paperclip" size="sm" className={base.cheadIconMuted} />
        첨부
        <span className={base.cheadNote}>{advice.files.length}개</span>
      </header>
      <div className={base.cbody}>
        <div className={css.fileList}>
          {advice.files.map((file) => (
            <FileItem
              key={file.id}
              filename={file.name}
              fileMeta={toFileMeta(file.name, file.size)}
              onClick={() => openFile(file.id)}
            />
          ))}
          {advice.files.length === 0 && <p className={css.emptyThread}>올린 파일이 없어요.</p>}
        </div>

        {canUpload && (
          <div className={css.fileUpload}>
            <FileUploadArea
              variant="basic"
              description={isUploading ? "올리는 중…" : "파일을 여기에 놓거나 버튼으로 고르세요."}
              onFilesAdded={(added: File[]) => uploadFiles(added)}
            />
            {uploadError && <p className={css.fileError}>{uploadError}</p>}
          </div>
        )}
        {isOpening && (
          <Button size="small" variant="outline" color="secondary" disabled>
            여는 중…
          </Button>
        )}
      </div>
    </section>
  );
};
