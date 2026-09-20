import type { ReactNode } from "react";
import * as s from "../RichTextEditor.css";

interface ToolbarButtonProps {
  /** 툴팁·스크린리더 라벨 */
  tip: string;
  /** 켜짐 표시(굵게·정렬 등) */
  isActive?: boolean;
  /** 못 누르는 상태(실행취소 할 게 없을 때 등) */
  isDisabled?: boolean;
  onClick: () => void;
  children: ReactNode;
  /** 로아이 칩처럼 모양을 덧입힐 때 */
  className?: string;
}

/**
 * 서식 툴바의 아이콘 버튼 — 기존 RichTextEditor 툴바와 완전히 같은 모양(s.tbtn)을 쓴다.
 * lds-exempt: 30px 아이콘 토글 + data-tip 툴팁 + 켜짐 상태를 가진 서식 툴바 버튼은
 * LDS Button 으로 만들 수 없어(크기·토글·툴팁 슬롯 없음) 기존 에디터 툴바 패턴을 그대로 따른다.
 */
export const ToolbarButton = ({ tip, isActive = false, isDisabled = false, onClick, children, className }: ToolbarButtonProps) => (
  <button
    type="button"
    className={className ? `${s.tbtn} ${className}` : s.tbtn}
    data-active={isActive}
    data-tip={tip}
    aria-label={tip}
    disabled={isDisabled}
    aria-disabled={isDisabled}
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
  >
    {children}
  </button>
);
