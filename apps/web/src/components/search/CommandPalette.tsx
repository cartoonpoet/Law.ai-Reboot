import type { KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@lawkit/ui";
import type { IconName } from "@lawkit/ui";
import { cx } from "../../pages/contract/cx";
import { useAssistant } from "../assistant/useAssistant";
import { useCommandPalette } from "./useCommandPalette";
import { useCommandPaletteResults } from "./useCommandPaletteResults";
import type { PaletteItemTypes } from "./useCommandPaletteResults";
import * as css from "./commandPalette.css";

const LISTBOX_ID = "command-palette-list";

const getOptionId = (item: PaletteItemTypes) => `command-palette-${item.key}`;

/** 통합검색창(Ctrl+K). 닫혀 있으면 아무것도 그리지 않고, 열 때마다 검색어·선택이 새로 시작된다. */
export const CommandPalette = () => {
  const { isOpen, close } = useCommandPalette();
  return isOpen ? <CommandPaletteDialog onClose={close} /> : null;
};

interface CommandPaletteDialogProps {
  onClose: () => void;
}

const CommandPaletteDialog = ({ onClose }: CommandPaletteDialogProps) => {
  const navigate = useNavigate();
  const assistant = useAssistant();
  const results = useCommandPaletteResults();

  const handleSelect = (item: PaletteItemTypes) => {
    onClose();
    if (item.kind !== "ai") {
      navigate(item.path);
      return;
    }
    // 검색어가 있으면 그 문장을 바로 질문으로, 없으면 대화만 연다.
    if (item.prompt) assistant.ask(item.prompt);
    else assistant.open("chat");
  };

  const KEY_HANDLERS: Record<string, () => void> = {
    ArrowDown: results.moveNext,
    ArrowUp: results.movePrev,
    Enter: () => handleSelect(results.selectedItem),
    Tab: () => handleSelect(results.aiItem),
    Escape: onClose,
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const handler = KEY_HANDLERS[event.key];
    if (!handler) return;
    event.preventDefault();
    handler();
  };

  const getOptionProps = (item: PaletteItemTypes) => {
    const index = results.items.indexOf(item);
    const isSelected = index === results.selectedIndex;
    return {
      id: getOptionId(item),
      role: "option" as const,
      type: "button" as const,
      tabIndex: -1,
      "aria-selected": isSelected,
      className: cx(css.option, isSelected && css.optionSelected, item.kind === "ai" && css.aiOption),
      onMouseMove: () => results.select(index),
      onClick: () => handleSelect(item),
    };
  };

  return (
    <div className={css.overlay}>
      <button type="button" className={css.backdrop} tabIndex={-1} aria-label="통합검색 닫기" onClick={onClose} />
      <div className={css.dialog} role="dialog" aria-modal="true" aria-label="통합검색">
        <div className={css.inputRow}>
          <Icon name="search" size="sm" className={css.inputIcon} />
          <input
            className={css.input}
            autoFocus
            value={results.query}
            onChange={(event) => results.changeQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="계약·메뉴를 찾거나 AI 비서에게 물어보세요"
            aria-label="통합검색어"
            role="combobox"
            aria-expanded="true"
            aria-controls={LISTBOX_ID}
            aria-activedescendant={getOptionId(results.selectedItem)}
          />
          <kbd className={css.kbd}>Esc</kbd>
        </div>

        <div id={LISTBOX_ID} role="listbox" aria-label="검색 결과" className={css.body}>
          {results.keyword && (
            <section className={css.group} aria-label="계약">
              <div className={css.groupLabel}>계약</div>
              {results.contracts.map((item) => (
                <button key={item.key} {...getOptionProps(item)}>
                  <span className={css.optionIcon}>
                    <Icon name="fileFind" size="sm" className={css.optionGlyph} />
                  </span>
                  <span className={css.optionMain}>
                    <span className={css.optionTitle}>{item.title}</span>
                    <span className={css.optionMeta}>{item.meta}</span>
                  </span>
                  <span className={css.optionCode}>{item.code}</span>
                </button>
              ))}
              {results.contracts.length === 0 && (
                <p className={css.groupEmpty}>{results.isSearching ? "계약을 찾는 중…" : "일치하는 계약이 없어요"}</p>
              )}
            </section>
          )}

          {results.menus.length > 0 && (
            <section className={css.group} aria-label="메뉴로 이동">
              <div className={css.groupLabel}>메뉴로 이동</div>
              {results.menus.map((item) => (
                <button key={item.key} {...getOptionProps(item)}>
                  <span className={css.optionIcon}>
                    <Icon name={item.icon as IconName} size="sm" className={css.optionGlyph} />
                  </span>
                  <span className={css.optionMain}>
                    <span className={css.optionTitle}>{item.title}</span>
                  </span>
                </button>
              ))}
            </section>
          )}

          <div className={css.aiArea}>
            <button {...getOptionProps(results.aiItem)}>
              <span className={css.aiIcon}>
                <Icon name="autoAwesome" size="sm" className={css.aiGlyph} />
              </span>
              <span className={css.optionMain}>
                <span className={css.aiTitle}>AI 비서에게 물어보기</span>
                <span className={css.optionMeta}>
                  {results.keyword ? `“${results.keyword}”` : "문장으로 물으면 내 계약·결재 데이터로 답해요"}
                </span>
              </span>
              <kbd className={css.kbd}>Tab</kbd>
            </button>
          </div>
        </div>

        <div className={css.footer}>
          <span className={css.hint}><kbd className={css.kbd}>↑↓</kbd>이동</span>
          <span className={css.hint}><kbd className={css.kbd}>Enter</kbd>열기</span>
          <span className={css.hint}><kbd className={css.kbd}>Tab</kbd>AI 비서에게</span>
          <span className={css.hint}><kbd className={css.kbd}>Esc</kbd>닫기</span>
        </div>
      </div>
    </div>
  );
};
