import { useState } from "react";
import { Button, Callout, Icon } from "@lawkit/ui";
import { Eyebrow } from "../../../components/ui/Eyebrow";
import { RichTextEditor } from "../../../components/ui/RichTextEditor";
import { LoaiPanel, type LoaiModeTypes } from "./LoaiPanel";
import { SelectionBubble } from "./SelectionBubble";
import { VersionHistoryModal } from "./VersionHistoryModal";
import { getEditorPageCount } from "../../../components/ui/editorExtensions/pageLayoutExtension";
import { MOCK_BLANK_HTML, MOCK_NDA_HTML, MOCK_VERSIONS } from "./documentEditorMockData";
import * as css from "./documentEditorMock.css";

interface DocumentEditorMockProps {
  /** 시안 안내 상자 제목·설명 */
  variant: string;
  description: string;
  /** true면 빈 문서로 시작한다(저장 이력 없음). 없으면 이미 있는 NDA 표준 양식을 열어 둔 상태로 시작. */
  startBlank?: boolean;
  /** 처음부터 열어 둘 로아이 패널 모드. 없으면 닫힌 상태. */
  initialLoaiMode?: LoaiModeTypes;
  /** 처음부터 버전 이력 모달을 열어 둘지 */
  isVersionOpenAtFirst?: boolean;
  /** 로아이 "문장 다듬기"에 미리 넣어 둘 고른 문장 */
  initialSelectedText?: string;
}

const LATEST = MOCK_VERSIONS[0];

/** 종이에 실제로 쓴 글이 있는지 — 빈 문단(<p></p>)만 있으면 빈 문서로 본다. */
const checkHasBody = (html: string): boolean =>
  html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim() !== "";

/**
 * 2·3·4. 문서 편집기 — 종이처럼 보이는 캔버스 + 기존 서식 툴바(표·로아이 추가) + 로아이 패널 + 버전 이력.
 * 실제 편집은 기존 RichTextEditor(Tiptap)를 그대로 쓰고, 이 화면은 그 위에 문서 작업에 필요한 것만 얹는다.
 */
export const DocumentEditorMock = ({
  variant,
  description,
  startBlank = false,
  initialLoaiMode,
  isVersionOpenAtFirst = false,
  initialSelectedText = "",
}: DocumentEditorMockProps) => {
  const [content, setContent] = useState(startBlank ? MOCK_BLANK_HTML : MOCK_NDA_HTML);
  const [loaiMode, setLoaiMode] = useState<LoaiModeTypes | null>(initialLoaiMode ?? null);
  const [isVersionOpen, setIsVersionOpen] = useState(isVersionOpenAtFirst);
  const [selectedText, setSelectedText] = useState(initialSelectedText);

  const handleToggleLoai = () => setLoaiMode(loaiMode === null ? "draft" : null);

  const handleRewrite = (text: string) => {
    setSelectedText(text);
    setLoaiMode("rewrite");
  };

  const handleDraftCreated = (html: string) => {
    setContent(html);
    setLoaiMode(null);
  };

  return (
    <div>
      <div className={css.mockNote}>
        <Callout intent="info" title={variant}>
          {description}
        </Callout>
      </div>

      <div className={css.editorHead}>
        <div className={css.editorTitleGroup}>
          <Eyebrow>계약 관리 · 표준양식 관리</Eyebrow>
          <div className={css.editorTitleRow}>
            <h1 className={css.editorTitle}>{startBlank ? "제목 없는 새 양식" : "비밀유지계약서(NDA) 표준"}</h1>
            {!startBlank && <span className={css.verChip}>v{LATEST.versionNo}</span>}
          </div>
          <span className={css.editorSub}>
            {startBlank
              ? "아직 저장한 이력이 없습니다 · 처음 저장하면 v1로 쌓입니다"
              : `비밀유지(NDA) · 마지막 저장 ${LATEST.savedAt} · ${LATEST.savedBy}`}
          </span>
        </div>

        <div className={css.editorActions}>
          {!startBlank && (
            <Button
              variant="outline"
              color="secondary"
              iconLeft={<Icon name="history" size="sm" />}
              onClick={() => setIsVersionOpen(true)}
            >
              버전 이력
            </Button>
          )}
          <Button iconLeft={<Icon name="save" size="sm" />}>저장하기</Button>
        </div>
      </div>

      <div className={loaiMode === null ? css.editorLayout.solo : css.editorLayout.withPanel}>
        <RichTextEditor
          ariaLabel="표준양식 문서 편집기"
          value={content}
          onChange={setContent}
          placeholder={startBlank ? "제목부터 적거나, 오른쪽 로아이에게 초안을 만들어 달라고 해 보세요." : undefined}
          withTable
          withFullToolbar
          withPageLayout
          onLoaiClick={handleToggleLoai}
          isLoaiOpen={loaiMode !== null}
          wrapClassName={css.docShell}
          areaClassName={css.docPage}
          renderFooterExtra={(editor) => {
            const pageCount = getEditorPageCount(editor);
            return (
              <span className={css.docFoot}>
                {pageCount !== null && <span className={css.docFootText}>총 {pageCount}페이지</span>}
                <span className={css.docFootText}>
                  {startBlank ? "저장하면 v1로 쌓입니다" : `다음 저장은 v${LATEST.versionNo + 1} 로 쌓입니다`}
                </span>
                {!startBlank && <span className={css.docFootSaved}>고친 내용 있음</span>}
              </span>
            );
          }}
          renderOverlay={(editor) => {
            const { from, to, empty } = editor.state.selection;
            if (empty) return null;
            return <SelectionBubble onRewrite={() => handleRewrite(editor.state.doc.textBetween(from, to, " "))} />;
          }}
        />

        {loaiMode !== null && (
          <LoaiPanel
            mode={loaiMode}
            onModeChange={setLoaiMode}
            onClose={() => setLoaiMode(null)}
            selectedText={selectedText}
            onDraftCreated={handleDraftCreated}
            hasDocumentContent={checkHasBody(content)}
          />
        )}
      </div>

      {isVersionOpen && <VersionHistoryModal onClose={() => setIsVersionOpen(false)} />}
    </div>
  );
};
