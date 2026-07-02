import { useState } from "react";
import { Button, Switch } from "@lawkit/ui";
import {
  MockContractBackdrop,
  MockDiffText,
  MockOriginalDoc,
  MockRevisedDoc,
  MOCK_FILES,
  type MockFile,
} from "./MockContractBackdrop";
import * as css from "./mockups.css";

type Mode = "single" | "split" | "diff";

/**
 * 시안 B — 우측 드로어 + 비교 토글.
 * 첨부 "미리보기" → 우측 슬라이드 인 → 드로어 안 토글로 비교 모드.
 * 좌측 계약 본문/코멘트는 계속 보임(좁아질 뿐).
 */
export function PreviewDrawerMock() {
  const [activeFile, setActiveFile] = useState<MockFile | null>(null);
  const [mode, setMode] = useState<Mode>("single");
  const [syncScroll, setSyncScroll] = useState(true);

  const open = activeFile !== null;
  // 비교 대상 — 현재 파일이 아닌 첫 첨부를 자동 선택(시안용).
  const pickedFile = MOCK_FILES.find((f) => f.id !== activeFile?.id);

  const handleOpen = (file: MockFile) => {
    setActiveFile(file);
    setMode("single");
  };

  const handleClose = () => {
    setActiveFile(null);
    setMode("single");
  };

  return (
    <>
      <MockContractBackdrop
        variant="B"
        onPreview={handleOpen}
        onCompare={(f) => {
          handleOpen(f);
          setMode("split");
        }}
      />

      {open && (
        <aside className={css.drawerWrap}>
          <div className={css.drawerHeader}>
            <span className={css.drawerHeaderTitle}>
              📄 {activeFile?.name}
              {mode !== "single" && pickedFile && (
                <span> ↔ {pickedFile.name}</span>
              )}
            </span>
            <div className={css.drawerHeaderActions}>
              {mode === "single" ? (
                <>
                  <Button
                    size="small"
                    variant="outline"
                    onClick={() => setMode("split")}
                  >
                    ⇆ 비교 켜기
                  </Button>
                  <Button size="small" variant="outline">
                    ⬇
                  </Button>
                </>
              ) : (
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
                    diff
                  </Button>
                  <Button
                    size="small"
                    variant="outline"
                    onClick={() => setMode("single")}
                  >
                    ← 미리보기
                  </Button>
                </>
              )}
              <Button size="small" variant="outline" onClick={handleClose}>
                ✕
              </Button>
            </div>
          </div>

          <div className={css.drawerBody}>
            {mode === "single" && (
              <>
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
            {mode === "split" && (
              <>
                <div className={css.compareSplit}>
                  <div className={css.compareCol}>
                    <div className={css.compareColLabel}>
                      A · {activeFile?.name}
                    </div>
                    <MockOriginalDoc />
                  </div>
                  <div className={css.compareCol}>
                    <div className={css.compareColLabel}>
                      B · {pickedFile?.name}
                    </div>
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
            {mode === "diff" && (
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
          </div>
        </aside>
      )}
    </>
  );
}
