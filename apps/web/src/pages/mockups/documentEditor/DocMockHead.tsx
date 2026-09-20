import type { ReactNode } from "react";
import { Callout } from "@lawkit/ui";
import { Eyebrow } from "../../../components/ui/Eyebrow";
import * as shared from "../../advice/adviceShared.css";
import * as css from "./documentEditorMock.css";

interface DocMockHeadProps {
  /** 시안 안내 상자 제목 */
  variant: string;
  description: string;
  eyebrow: string;
  title: string;
  children?: ReactNode;
}

/** 문서 편집기 시안 공통 머리 — 시안 안내 + 계약·자문과 같은 페이지 머리(Eyebrow + 제목 + 우측 액션). */
export const DocMockHead = ({ variant, description, eyebrow, title, children }: DocMockHeadProps) => (
  <>
    <div className={css.mockNote}>
      <Callout intent="info" title={variant}>
        {description}
      </Callout>
    </div>

    <div className={shared.pageHead}>
      <div className={shared.pageTitleGroup}>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className={shared.pageTitle}>{title}</h1>
      </div>
      {children && <div className={shared.pageActions}>{children}</div>}
    </div>
  </>
);
