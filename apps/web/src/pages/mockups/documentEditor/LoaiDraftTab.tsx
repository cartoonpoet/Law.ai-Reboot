import { useState } from "react";
import { Button, Icon, Textarea } from "@lawkit/ui";
import { MOCK_DRAFT_PRESETS } from "./documentEditorMockData";
import * as css from "./documentEditorMock.css";

/** 로아이 ① 초안 생성 — 어떤 계약서를 쓸지 말하면 조항 구조까지 갖춘 초안을 만들어 넣는다. */
export const LoaiDraftTab = () => {
  const [request, setRequest] = useState("");

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
        {MOCK_DRAFT_PRESETS.map((preset) => (
          <div key={preset} className={css.presetItem} onClick={() => setRequest(preset)}>
            {preset}
          </div>
        ))}
      </div>

      <Button iconLeft={<Icon name="autoAwesome" size="sm" />} disabled={request.trim() === ""}>
        초안 만들기
      </Button>

      <p className={css.disclaimer}>
        로아이가 만든 초안은 참고용이에요. 회사에 맞는 조건인지 담당 변호사가 꼭 확인하세요.
      </p>
    </>
  );
};
