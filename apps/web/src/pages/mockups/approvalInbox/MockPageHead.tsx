import type { ReactNode } from "react";
import { Callout, HStack, VStack } from "@lawkit/ui";
import { Eyebrow } from "../../../components/ui/Eyebrow";
import * as css from "./approvalInboxMock.css";

interface MockPageHeadProps {
  variant: string;
  description: string;
  children?: ReactNode;
}

/** 시안 공통 머리 — 어떤 시안인지 안내 + 결재 대기함 제목. */
export const MockPageHead = ({ variant, description, children }: MockPageHeadProps) => (
  <VStack gap="x4">
    <Callout intent="info" title={variant}>
      {description}
    </Callout>
    <HStack gap="x4" justify="between" align="end">
      <VStack gap="x1">
        <Eyebrow>결재</Eyebrow>
        <h1 className={css.pageTitle}>결재 대기함</h1>
      </VStack>
      {children}
    </HStack>
  </VStack>
);
