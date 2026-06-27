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
} from "./MockContractBackdrop";
import * as css from "./mockups.css";

type Mode = "split" | "diff";

/**
 * B3 — 비교 모드 토글.
 *
 * 페이지 상단의 "비교 모드" 토글 ON 시 첨부 행이 체크박스 모드로 전환.
 * 두 개 선택되는 순간 자동으로 비교 모달이 열림(추가 버튼/단계 없음).
 *
 * 클릭 수: 비교모드 ON(1) → 파일1 체크(1) → 파일2 체크(1, 자동진입) = 3.
 * 다만 시각적으로 가장 명확 — 여러 파일 중 둘 고르는 게 일반적인 케이스라면 추천.
 */
export function ComparePickerMock() {
  const [pickMode, setPickMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("split");
  const [syncScroll, setSyncScroll] = useState(true);

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      }
      const next = [...prev, id];
      // 두 개 선택되면 모달 자동 진입.
      if (next.length === 2) {
        setOpen(true);
        setMode("split");
      }
      return next.slice(-2);
    });
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedIds([]);
    setPickMode(false);
  };

  const [fileA, fileB] = selectedIds.map(
    (id) => MOCK_FILES.find((f) => f.id === id)!,
  );

  return (
    <>
      <MockContractBackdrop
        variant="A"
        onPreview={() => {
          window.alert(
            "이 시안은 비교 모드 시각화 — 미리보기는 /mockups/preview-modal 참고",
          );
        }}
        selectable={pickMode}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
        extraActions={
          <Button
            variant={pickMode ? "default" : "outline"}
            onClick={() => {
              setPickMode((v) => !v);
              setSelectedIds([]);
            }}
          >
            {pickMode
              ? `비교할 파일 선택 (${selectedIds.length}/2)`
              : "📊 두 파일 비교 모드"}
          </Button>
        }
      />

      <Modal open={open} onClose={handleClose} size="xlarge">
        <ModalHeader
          actions={
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
            </>
          }
        >
          <span className={css.compareHeader}>
            <span className={css.compareHeaderLabel}>A · {fileA?.name}</span>
            <span className={css.compareHeaderSwap}>↔</span>
            <span className={css.compareHeaderLabel}>B · {fileB?.name}</span>
          </span>
        </ModalHeader>

        <ModalBody>
          {mode === "split" ? (
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
          ) : (
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
