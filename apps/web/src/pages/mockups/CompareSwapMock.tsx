import { useState } from "react";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Dropdown,
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

type Mode = "split" | "diff";

/**
 * B2 — 미리보기에서 스왑.
 *
 * 기본: 행 "미리보기" 또는 "문서 비교" 둘 다 같은 모달 진입(첫 화면 = single preview).
 * 헤더에 항상 "비교: [선택 ▾]" dropdown 노출. dropdown 에서 파일 고르면 split 으로 morph.
 * dropdown 을 비우면 다시 single.
 *
 * 클릭 수: 미리보기에서 비교로 진입 = 1 (dropdown pick).
 */
export function CompareSwapMock() {
  const [fileA, setFileA] = useState<MockFile | null>(null);
  const [fileBId, setFileBId] = useState<string>("");
  const [mode, setMode] = useState<Mode>("split");
  const [syncScroll, setSyncScroll] = useState(true);

  const open = fileA !== null;
  const fileB = MOCK_FILES.find((f) => f.id === fileBId);
  const isCompare = Boolean(fileB);

  const handleOpen = (a: MockFile) => {
    setFileA(a);
    setFileBId("");
    setMode("split");
  };

  const handleClose = () => {
    setFileA(null);
  };

  const bOptions = MOCK_FILES.filter((f) => f.id !== fileA?.id).map((f) => ({
    value: f.id,
    label: `${f.name} · ${f.kind}`,
  }));

  return (
    <>
      <MockContractBackdrop
        variant="A"
        onPreview={handleOpen}
        onCompare={handleOpen}
      />

      <Modal open={open} onClose={handleClose} size="xlarge">
        <ModalHeader
          actions={
            isCompare ? (
              <>
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
                <Button size="small" variant="outline" onClick={() => setFileBId("")}>
                  ← 미리보기
                </Button>
              </>
            ) : (
              <Button size="small" variant="outline">
                ⬇ 다운로드
              </Button>
            )
          }
        >
          <span className={css.compareHeader}>
            <span className={css.compareHeaderLabel}>{fileA?.name}</span>
            <span className={css.compareHeaderSwap}>↔</span>
            <span className={css.compareHeaderPicker}>
              <Dropdown
                size="small"
                options={bOptions}
                value={fileBId}
                onChange={(v) =>
                  setFileBId(typeof v === "string" ? v : (v[0] ?? ""))
                }
                placeholder="비교할 파일 선택…"
              />
            </span>
          </span>
        </ModalHeader>

        <ModalBody>
          {!isCompare && (
            <>
              <div className={css.compareHint}>
                💡 오른쪽 dropdown 에서 파일을 고르면 좌우 비교로 전환됩니다.
              </div>
              <div className={css.previewArea}>
                <div className={css.previewPage}>
                  <MockOriginalDoc />
                </div>
              </div>
              <div className={css.previewToolbar}>
                <span>◀ 1 / 24 ▶</span>
                <span>🔍 −  100%  +</span>
              </div>
            </>
          )}

          {isCompare && mode === "split" && (
            <>
              <div className={css.compareSplit}>
                <div className={css.compareCol}>
                  <div className={css.compareColLabel}>A · {fileA?.name}</div>
                  <MockOriginalDoc />
                </div>
                <div className={css.compareCol}>
                  <div className={css.compareColLabel}>B · {fileB?.name}</div>
                  <MockRevisedDoc />
                </div>
              </div>
              <div className={css.previewToolbar}>
                <span>변경 1 / 9 — 이전 / 다음</span>
                <span>
                  <Switch
                    size="small"
                    checked={syncScroll}
                    onCheckedChange={setSyncScroll}
                  />{" "}
                  동기 스크롤
                </span>
              </div>
            </>
          )}

          {isCompare && mode === "diff" && (
            <>
              <div className={css.previewArea}>
                <div className={css.previewPage}>
                  <MockDiffText />
                </div>
              </div>
              <div className={css.previewToolbar}>
                <span>변경 요약: 추가 3 · 수정 5 · 삭제 1</span>
                <span>🔍 −  100%  +</span>
              </div>
            </>
          )}
        </ModalBody>

        <ModalFooter>
          <Button variant="outline" onClick={handleClose}>
            닫기
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}
