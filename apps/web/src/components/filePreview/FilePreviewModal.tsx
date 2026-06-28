import { lazy, Suspense, useState } from "react";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Dropdown,
} from "@lawkit/ui";
import { FileRenderer } from "./FileRenderer";
import { isTextExtractable } from "./extract/extractText";
import { useDownloadChangeReport } from "./useDownloadChangeReport";
import * as css from "./filePreview.css";

// DiffView 는 diff + extract 청크를 끌어와 무거워질 수 있어 별 청크로 lazy.
const DiffView = lazy(async () => ({
  default: (await import("./DiffView")).DiffView,
}));

export interface PreviewFileRef {
  id: string;
  name: string;
  mimeType: string | null;
}

type CompareMode = "split" | "diff";

interface FilePreviewModalProps {
  open: boolean;
  fileA: PreviewFileRef | null;
  // 비교할 파일(B). null 이면 단일 미리보기, 값이 있으면 좌우 분할 또는 텍스트 diff.
  fileB: PreviewFileRef | null;
  // 후보(B 교체용 dropdown 옵션 — 같은 코멘트 등의 다른 파일).
  candidates: PreviewFileRef[];
  onChangeFileB: (fileId: string | null) => void;
  onClose: () => void;
}

/**
 * 파일 미리보기 + (선택) 좌우 비교 / 텍스트 diff 모달.
 *
 * - fileB === null → 단일 미리보기.
 * - fileB !== null + mode="split" → 좌우 분할(원본 렌더).
 * - fileB !== null + mode="diff" → 두 파일 평문 추출 후 jsdiff unified diff. PDF/DOCX 만 활성.
 */
export function FilePreviewModal({
  open,
  fileA,
  fileB,
  candidates,
  onChangeFileB,
  onClose,
}: FilePreviewModalProps) {
  const [mode, setMode] = useState<CompareMode>("split");
  const isCompare = fileB !== null;
  const diffSupported =
    isCompare &&
    fileA !== null &&
    isTextExtractable(fileA.mimeType, fileA.name) &&
    isTextExtractable(fileB.mimeType, fileB.name);

  // 변경 보고서 다운로드 — 두 파일 모두 텍스트 추출 가능할 때만(=diffSupported).
  // useFileText 캐시 공유 → DiffView 가 이미 추출했으면 즉시 PDF 가능.
  const report = useDownloadChangeReport(
    diffSupported ? fileA : null,
    diffSupported ? fileB : null,
  );

  const options = candidates
    .filter((c) => c.id !== fileA?.id)
    .map((c) => ({ value: c.id, label: c.name }));

  // B 가 바뀌어 diff 불가가 되면 split 으로 강제 복귀(잘못된 mode 잔존 방지).
  const effectiveMode: CompareMode = mode === "diff" && !diffSupported ? "split" : mode;

  return (
    <Modal open={open} onClose={onClose} size="xlarge">
      <ModalHeader
        actions={
          isCompare ? (
            <>
              <Button
                size="small"
                variant={effectiveMode === "split" ? "default" : "outline"}
                onClick={() => setMode("split")}
              >
                좌우
              </Button>
              <Button
                size="small"
                variant={effectiveMode === "diff" ? "default" : "outline"}
                disabled={!diffSupported}
                onClick={() => setMode("diff")}
                title={
                  diffSupported
                    ? "텍스트 diff"
                    : "PDF / DOCX 두 파일일 때만 사용 가능"
                }
              >
                텍스트 diff
              </Button>
              <Button
                size="small"
                variant="outline"
                disabled={!report.isReady || report.isDownloading}
                onClick={report.download}
                title={
                  diffSupported
                    ? "두 파일의 변경 사항을 PDF 로 다운로드 (결재 첨부·감사 보관용)"
                    : "PDF / DOCX 두 파일일 때만 사용 가능"
                }
              >
                {report.isDownloading ? "PDF 생성 중…" : "📄 변경 보고서"}
              </Button>
              <Button size="small" variant="outline" onClick={() => onChangeFileB(null)}>
                ← 미리보기
              </Button>
            </>
          ) : null
        }
      >
        <span className={css.header}>
          <span className={css.headerLabel}>{fileA?.name ?? ""}</span>
          {(isCompare || candidates.length > 0) && (
            <>
              <span className={css.headerSwap}>↔</span>
              <span className={css.headerPicker}>
                <Dropdown
                  size="small"
                  options={options}
                  value={fileB?.id ?? ""}
                  onChange={(v) => {
                    const id = typeof v === "string" ? v : v[0];
                    onChangeFileB(id ?? null);
                  }}
                  placeholder="비교할 파일 선택…"
                />
              </span>
            </>
          )}
        </span>
      </ModalHeader>

      <ModalBody>
        {fileA && (
          <div className={css.stage}>
            {!isCompare && (
              <div className={css.single}>
                <FileRenderer
                  fileId={fileA.id}
                  fileName={fileA.name}
                  mimeType={fileA.mimeType}
                />
              </div>
            )}

            {isCompare && effectiveMode === "split" && (
              <div className={css.split}>
                <div className={css.splitCol}>
                  <div className={css.splitColLabel}>A · {fileA.name}</div>
                  <div className={css.splitColBody}>
                    <FileRenderer
                      fileId={fileA.id}
                      fileName={fileA.name}
                      mimeType={fileA.mimeType}
                      width={420}
                    />
                  </div>
                </div>
                <div className={css.splitCol}>
                  <div className={css.splitColLabel}>B · {fileB.name}</div>
                  <div className={css.splitColBody}>
                    <FileRenderer
                      fileId={fileB.id}
                      fileName={fileB.name}
                      mimeType={fileB.mimeType}
                      width={420}
                    />
                  </div>
                </div>
              </div>
            )}

            {isCompare && effectiveMode === "diff" && diffSupported && (
              <Suspense
                fallback={<div className={css.placeholder}>diff 모듈 로딩…</div>}
              >
                <DiffView fileA={fileA} fileB={fileB} />
              </Suspense>
            )}
          </div>
        )}
      </ModalBody>

      <ModalFooter>
        <Button variant="outline" onClick={onClose}>
          닫기
        </Button>
      </ModalFooter>
    </Modal>
  );
}
