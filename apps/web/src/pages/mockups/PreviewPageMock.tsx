import { useState } from "react";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Switch,
} from "@lawkit/ui";
import {
  MockContractBackdrop,
  MockDiffText,
  MockOriginalDoc,
  MockRevisedDoc,
  MOCK_FILES,
  type MockFile,
} from "./MockContractBackdrop";
import * as css from "./mockups.css";

type View = "list" | "compare";
type Mode = "split" | "diff";

/**
 * 시안 C — 전용 비교 페이지(GitHub PR diff 스타일).
 * - 단일 미리보기는 모달 재사용(시안 A 와 동일).
 * - 첨부 체크박스 2개 선택 → 상단 "두 파일 비교" → 풀스크린 페이지 전환(URL 공유 가능).
 */
export function PreviewPageMock() {
  const [view, setView] = useState<View>("list");
  const [mode, setMode] = useState<Mode>("split");
  const [selectedIds, setSelectedIds] = useState<string[]>([
    MOCK_FILES[0].id,
    MOCK_FILES[1].id,
  ]);
  const [previewFile, setPreviewFile] = useState<MockFile | null>(null);
  const [syncScroll, setSyncScroll] = useState(true);

  const toggleSelect = (id: string) =>
    setSelectedIds((arr) =>
      arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id],
    );

  const selectedFiles = MOCK_FILES.filter((f) => selectedIds.includes(f.id));

  if (view === "compare" && selectedFiles.length >= 2) {
    const [fileA, fileB] = selectedFiles;
    return (
      <div className={css.fullPageShell}>
        <div className={css.fullPageHeader}>
          <div className={css.fullPageTitle}>
            <Button
              size="small"
              variant="outline"
              onClick={() => setView("list")}
            >
              ← 계약으로 돌아가기
            </Button>
            <span>
              ⇄ {fileA.name} ↔ {fileB.name}
            </span>
          </div>
          <div className={css.fullPageActions}>
            <Button size="small" variant="outline">
              ⬇ 변경 보고서
            </Button>
            <Button size="small" variant="outline">
              🔗 링크 복사
            </Button>
            <Button
              size="small"
              variant={mode === "split" ? "default" : "outline"}
              onClick={() => setMode("split")}
            >
              좌우
            </Button>
            <Button
              size="small"
              variant={mode === "diff" ? "default" : "outline"}
              onClick={() => setMode("diff")}
            >
              텍스트 diff
            </Button>
          </div>
        </div>
        <div className={css.fullPageBody}>
          {mode === "split" ? (
            <div className={css.compareSplit}>
              <div className={css.compareCol}>
                <div className={css.compareColLabel}>A · {fileA.name}</div>
                <MockOriginalDoc />
              </div>
              <div className={css.compareCol}>
                <div className={css.compareColLabel}>B · {fileB.name}</div>
                <MockRevisedDoc />
              </div>
            </div>
          ) : (
            <div className={css.previewArea}>
              <div className={css.previewPage}>
                <MockDiffText />
              </div>
            </div>
          )}
          <div className={css.previewToolbar}>
            <span>변경 요약: 추가 3 · 수정 5 · 삭제 1 · ◀ 1 / 9 ▶</span>
            <span>
              <Switch
                size="small"
                checked={syncScroll}
                onCheckedChange={setSyncScroll}
              />{" "}
              동기 스크롤 · 🔍 100%
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <MockContractBackdrop
        variant="C"
        onPreview={(f) => setPreviewFile(f)}
        selectable
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        extraActions={
          <Button
            disabled={selectedIds.length !== 2}
            onClick={() => setView("compare")}
          >
            📊 두 파일 비교 ({selectedIds.length}/2)
          </Button>
        }
      />

      {previewFile && (
        <Modal
          open={true}
          onClose={() => setPreviewFile(null)}
          size="xlarge"
        >
          <ModalHeader
            actions={
              <Button size="small" variant="outline">
                ⬇ 다운로드
              </Button>
            }
          >
            {previewFile.name}
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
            <Button variant="outline" onClick={() => setPreviewFile(null)}>
              닫기
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </>
  );
}
