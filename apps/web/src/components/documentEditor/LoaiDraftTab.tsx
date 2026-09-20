import { useState } from "react";
import { Alert, Button, Icon, Textarea } from "@lawkit/ui";
import * as css from "../../pages/mockups/documentEditor/documentEditorMock.css";

interface LoaiDraftTabProps {
  /** 초안 만들기를 누르면 생성된 본문 HTML을 캔버스에 반영한다. */
  onCreated: (html: string) => void;
  /** 지금 종이에 쓴 내용이 있는지 — 있으면 덮어쓰기 전에 한 번 더 묻는다. */
  hasExistingContent: boolean;
  /** 요청 문구로 실제 초안 HTML을 만든다(AI 호출). */
  onGenerate: (request: string) => Promise<string>;
  /** "이렇게 물어보면 돼요" 예시 문구. */
  presets: string[];
}

/** 로아이 ① 초안 생성 — 어떤 계약서를 쓸지 말하면 조항 구조까지 갖춘 초안을 만들어 넣는다. */
export const LoaiDraftTab = ({ onCreated, hasExistingContent, onGenerate, presets }: LoaiDraftTabProps) => {
  const [request, setRequest] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isOverwriteAsked, setIsOverwriteAsked] = useState(false);

  const createDraft = async () => {
    setIsOverwriteAsked(false);
    setIsGenerating(true);
    try {
      onCreated(await onGenerate(request));
    } catch {
      // 실패 토스트는 onGenerate(useDocumentEditor.generateDraft)가 이미 띄웠다 — 여기서는 조용히 멈춘다.
    } finally {
      setIsGenerating(false);
    }
  };

  /** 이미 쓴 내용이 있으면 바로 만들지 않고 덮어쓸지부터 묻는다(패널 안내 문구와 같은 동작). */
  const handleCreate = () => {
    if (hasExistingContent) setIsOverwriteAsked(true);
    else void createDraft();
  };

  const handleCancelOverwrite = () => setIsOverwriteAsked(false);

  return (
    <>
      <p className={css.panelLead}>
        어떤 계약서를 쓸지 한 줄로 알려 주세요. 이미 쓴 내용이 있으면 바꾸기 전에 한 번 더 묻습니다.
      </p>

      <Textarea
        rows={4}
        placeholder="예) 물품공급계약서 초안을 만들어 줘. 우리가 물건을 받는 쪽이고, 검수 기간은 7일이야."
        value={request}
        onChange={(event) => setRequest(event.target.value)}
      />

      <div className={css.panelLabel}>이렇게 물어보면 돼요</div>
      <div className={css.presetList}>
        {presets.map((preset) => (
          <div key={preset} className={css.presetItem} onClick={() => setRequest(preset)}>
            {preset}
          </div>
        ))}
      </div>

      {isOverwriteAsked && (
        <Alert
          type="confirm"
          size="small"
          actions={[
            { label: "덮어쓰고 만들기", intent: "primary", onClick: () => void createDraft() },
            { label: "그냥 두기", intent: "secondary", onClick: handleCancelOverwrite },
          ]}
        >
          지금 종이에 쓰여 있는 내용을 지우고 새 초안으로 바꿉니다.
        </Alert>
      )}

      <Button
        iconLeft={<Icon name="autoAwesome" size="sm" />}
        disabled={request.trim() === "" || isGenerating}
        onClick={handleCreate}
      >
        {isGenerating ? "만드는 중…" : "초안 만들기"}
      </Button>

      <p className={css.disclaimer}>
        로아이가 만든 초안은 참고용이에요. 회사에 맞는 조건인지 담당 변호사가 꼭 확인하세요.
      </p>
    </>
  );
};
