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
 * B1 — 직진(스킵).
 *
 * 행의 "문서 비교" → pick 단계 없이 모달이 바로 split 으로 열린다.
 * 기본 B = 같은 그룹의 다른 첫 파일. 헤더 dropdown 으로 B 만 교체.
 *
 * 클릭 수: 비교 = 1 (B 변경 시 +1)
 */
export function CompareDirectMock() {
  const [fileA, setFileA] = useState<MockFile | null>(null);
  const [fileBId, setFileBId] = useState<string>("");
  const [mode, setMode] = useState<Mode>("split");
  const [syncScroll, setSyncScroll] = useState(true);

  const open = fileA !== null;
  const fileB = MOCK_FILES.find((f) => f.id === fileBId);

  const handleStart = (a: MockFile) => {
    setFileA(a);
    // 기본 B = 같은 종류의 다른 파일(없으면 그냥 첫 다른 파일).
    const sameKind = MOCK_FILES.find(
      (f) => f.id !== a.id && f.kind === a.kind,
    );
    setFileBId(
      sameKind?.id ?? MOCK_FILES.find((f) => f.id !== a.id)?.id ?? "",
    );
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
        onPreview={() => {
          window.alert("이 시안은 비교 전용 — 미리보기는 /mockups/preview-modal 참고");
        }}
        onCompare={handleStart}
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
              <Button size="small" variant="outline">
                ⬇ 변경 보고서
              </Button>
            </>
          }
        >
          <span className={css.compareHeader}>
            <span className={css.compareHeaderLabel}>A · {fileA?.name}</span>
            <span className={css.compareHeaderSwap}>↔</span>
            <span className={css.compareHeaderPicker}>
              <Dropdown
                size="small"
                options={bOptions}
                value={fileBId}
                onChange={(v) =>
                  setFileBId(typeof v === "string" ? v : (v[0] ?? ""))
                }
                placeholder="비교할 파일 선택"
              />
            </span>
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
                  <div className={css.compareColLabel}>
                    B · {fileB?.name ?? "선택 안 됨"}
                  </div>
                  {fileB ? <MockRevisedDoc /> : <p>오른쪽 dropdown 에서 비교할 파일을 골라주세요.</p>}
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
