type AlertType = "info" | "confirm" | "save-temporarily" | "secret";
type AlertSize = "small" | "medium";
type AlertLayout = "default" | "expanded";

export interface AlertProps {
  /**
   * Alert의 종류를 지정합니다.
   * @default 'info'
   */
  type?: AlertType;

  /**
   * Alert의 크기를 지정합니다.
   * @default 'medium'
   */
  size?: AlertSize;

  /**
   * Alert의 레이아웃을 지정합니다.
   * @default 'default'
   */
  layout?: AlertLayout;

  /**
   * X 버튼 표시 여부
   * @default false
   */
  hasXButton?: boolean;

  /**
   * 텍스트 버튼 표시 여부
   * @default false
   */
  hasTextButton?: boolean;

  /**
   * Alert의 내용
   */
  children: React.ReactNode;

  /**
   * 닫기 버튼 클릭 시 호출되는 함수
   */
  onClose?: () => void;

  /**
   * 텍스트 버튼 클릭 시 호출되는 함수
   */
  onTextButtonClick?: () => void;
}
