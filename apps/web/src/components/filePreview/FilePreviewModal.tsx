import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Dropdown } from "@lawkit/ui";
import { FileRenderer } from "./FileRenderer";
import * as css from "./filePreview.css";

export interface PreviewFileRef {
  id: string;
  name: string;
  mimeType: string | null;
}

interface FilePreviewModalProps {
  // open === null 이면 닫힘.
  open: boolean;
  fileA: PreviewFileRef | null;
  // 비교할 파일(B). null 이면 단일 미리보기, 값이 있으면 좌우 분할.
  fileB: PreviewFileRef | null;
  // 후보(B 교체용 dropdown 옵션 — A 와 같은 계약 안의 다른 파일들).
  candidates: PreviewFileRef[];
  onChangeFileB: (fileId: string | null) => void;
  onClose: () => void;
}

/**
 * 파일 미리보기 + (선택) 좌우 비교 모달.
 *
 * - fileB === null → 단일 미리보기(시안 A).
 * - fileB !== null → 좌우 분할(B1 — 직진). 헤더 dropdown 으로 B 교체, "← 미리보기" 로 단일 복귀.
 * - 렌더러 분기는 FileRenderer → pickRenderer 단일 출처. PDF/이미지/DOCX 외엔 UnsupportedRenderer 다운로드 안내.
 */
export function FilePreviewModal({
  open,
  fileA,
  fileB,
  candidates,
  onChangeFileB,
  onClose,
}: FilePreviewModalProps) {
  const isCompare = fileB !== null;

  // dropdown 옵션 — A 제외, 자기 자신 제거.
  const options = candidates
    .filter((c) => c.id !== fileA?.id)
    .map((c) => ({ value: c.id, label: c.name }));

  return (
    <Modal open={open} onClose={onClose} size="xlarge">
      <ModalHeader
        actions={
          isCompare ? (
            <Button size="small" variant="outline" onClick={() => onChangeFileB(null)}>
              ← 미리보기
            </Button>
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
            {isCompare ? (
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
            ) : (
              <div className={css.single}>
                <FileRenderer
                  fileId={fileA.id}
                  fileName={fileA.name}
                  mimeType={fileA.mimeType}
                />
              </div>
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
