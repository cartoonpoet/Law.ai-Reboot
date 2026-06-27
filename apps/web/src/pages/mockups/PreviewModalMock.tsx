import { useState } from "react";
import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from "@lawkit/ui";
import {
  MockContractBackdrop,
  MockOriginalDoc,
  type MockFile,
} from "./MockContractBackdrop";
import * as css from "./mockups.css";

/**
 * 시안 A — 미리보기 (확정안).
 *
 * 첨부 "미리보기" → 단순 모달. 헤더 액션은 다운로드만.
 * 문서 비교는 별도 시안(B1/B2/B3) 에서 단계 줄인 후보로 비교 평가한다.
 */
export function PreviewModalMock() {
  const [activeFile, setActiveFile] = useState<MockFile | null>(null);

  const open = activeFile !== null;

  return (
    <>
      <MockContractBackdrop
        variant="A"
        onPreview={setActiveFile}
        onCompare={() => {
          window.alert(
            "비교 UX 후보는 /mockups 에서 B1/B2/B3 시안으로 분리했습니다. 미리보기는 이 시안 그대로.",
          );
        }}
      />

      <Modal open={open} onClose={() => setActiveFile(null)} size="xlarge">
        <ModalHeader
          actions={
            <Button size="small" variant="outline">
              ⬇ 다운로드
            </Button>
          }
        >
          {activeFile?.name}
        </ModalHeader>
        <ModalBody>
          <div className={css.previewArea}>
            <div className={css.previewPage}>
              <MockOriginalDoc />
            </div>
          </div>
          <div className={css.previewToolbar}>
            <span>◀ 1 / 24 ▶</span>
            <span>🔍 −  100%  +</span>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setActiveFile(null)}>
            닫기
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}
