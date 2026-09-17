import type { ReactNode } from "react";
import { Callout } from "@lawkit/ui";
import { Eyebrow } from "../../../components/ui/Eyebrow";
import * as css from "./approvalInboxMock.css";

interface MockPageHeadProps {
  variant: string;
  description: string;
  children?: ReactNode;
}

/** 시안 공통 머리 — 어떤 시안인지 안내 + 결재 대기함 제목. */
export const MockPageHead = ({ variant, description, children }: MockPageHeadProps) => (
  <>
    <Callout intent="info" title={variant}>
      {description}
    </Callout>
    <div className={css.pageHead}>
      <div className={css.titleGroup}>
        <Eyebrow>결재</Eyebrow>
        <h1 className={css.pageTitle}>결재 대기함</h1>
      </div>
      {children}
    </div>
  </>
);
