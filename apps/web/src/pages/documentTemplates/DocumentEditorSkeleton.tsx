import { Skeleton } from "@lawkit/ui";
import * as css from "../mockups/documentEditor/documentEditorMock.css";

/** 문서 편집기 로딩 중 표시 — 머리(제목·버전 배지·버튼)와 문서 캔버스 모양을 본뜬 스켈레톤. */
export const DocumentEditorSkeleton = () => (
  <div>
    <div className={css.editorHead}>
      <div className={css.editorTitleGroup}>
        <Skeleton variant="text" width={110} height={11} />
        <div className={css.editorTitleRow}>
          <Skeleton variant="rect" width={220} height={24} />
          <Skeleton variant="rect" width={40} height={20} />
        </div>
      </div>
      <div className={css.editorActions}>
        <Skeleton variant="rect" width={96} height={34} />
        <Skeleton variant="rect" width={96} height={34} />
      </div>
    </div>
    <Skeleton variant="rect" width="100%" height={640} />
  </div>
);
