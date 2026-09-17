import { FileItem, Icon, LinkBadge } from "@lawkit/ui";
import type { IconName } from "@lawkit/ui";
import * as base from "../../../contract/contractDetail.css";
import * as css from "../adviceDetailV2.css";
import { ATTACHMENTS, RELATED_CONTRACT } from "./adviceDetailV2Data";

// 확장자 → 파일 유형 아이콘.
const getFileIconName = (filename: string): IconName => {
  if (filename.endsWith(".pdf")) return "fileTypePdf";
  if (filename.endsWith(".docx")) return "fileTypeDocx";
  return "fileText";
};

/** 첨부 파일 + 이 자문에서 이어진 계약. */
export const AdviceFilesCard = () => (
  <section className={base.card}>
    <header className={base.chead}>
      <Icon name="paperclip" size="sm" className={base.cheadIconMuted} />
      첨부 · 관련 계약
    </header>
    <div className={`${base.cbody} ${css.cardBodyStack}`}>
      <div>
        <div className={css.sectionLabel}>
          첨부 파일 <span className={css.sectionCount}>{ATTACHMENTS.length}</span>
        </div>
        <div className={css.fileList}>
          {ATTACHMENTS.map((file) => (
            <FileItem
              key={file.id}
              filename={file.name}
              fileMeta={file.meta}
              icon={<Icon name={getFileIconName(file.name)} size="sm" className={css.fileTypeIcon} />}
            />
          ))}
        </div>
      </div>
      <div>
        <div className={css.sectionLabel}>관련 계약</div>
        <div className={css.relatedRow}>
          <span>
            <LinkBadge href="/mockups/contract-lifecycle">{RELATED_CONTRACT.code}</LinkBadge>
          </span>
          <span className={css.relatedTitle}>{RELATED_CONTRACT.title}</span>
          <span className={css.relatedStage}>{RELATED_CONTRACT.stage}</span>
        </div>
      </div>
    </div>
  </section>
);
