import { Button, Callout, Icon, Modal } from "@lawkit/ui";
import type { TemplateVersionDto } from "@lawai/contracts";
import { Badge } from "../ui/Badge";
import * as css from "../../pages/mockups/documentEditor/documentEditorMock.css";

interface VersionHistoryModalProps {
  /** 저장 이력 — 최신이 먼저. */
  versions: TemplateVersionDto[];
  /** "이 버전으로 되돌리기"를 누르면 그 버전 번호로 되돌린다. */
  onRevert: (versionNo: number) => void;
  onClose: () => void;
}

/** ISO 저장 시각 → "2026-09-12 14:20" 형태. */
const formatSavedAt = (createdAt: string): string => createdAt.slice(0, 16).replace("T", " ");

/** 4. 버전 이력 모달 — 저장할 때마다 쌓인 버전을 보고, 옛 버전으로 되돌린다. */
export const VersionHistoryModal = ({ versions, onRevert, onClose }: VersionHistoryModalProps) => {
  const currentNo = versions[0]?.versionNo;

  return (
    <Modal
      open
      onClose={onClose}
      size="large"
      title="버전 이력"
      footer={
        <Button variant="outline" color="secondary" onClick={onClose}>
          닫기
        </Button>
      }
    >
      <div className={css.modalHint}>
        <Callout intent="info">
          저장할 때마다 새 버전이 쌓이고 옛 버전은 그대로 남습니다. 되돌리기를 누르면 그 내용이 새 버전으로 다시 저장되므로, 되돌린
          뒤에도 이력은 사라지지 않습니다.
        </Callout>
      </div>

      <div className={css.verList}>
        {versions.map((item) => {
          const isCurrent = item.versionNo === currentNo;
          return (
            <div key={item.versionNo} className={isCurrent ? `${css.verRow} ${css.verRowNow}` : css.verRow}>
              <span className={css.verNo}>v{item.versionNo}</span>
              <span className={css.verMain}>
                <span className={css.verMeta}>
                  {formatSavedAt(item.createdAt)} · {item.createdByName ?? "알 수 없는 사용자"}
                </span>
              </span>
              <span className={css.verAction}>
                {isCurrent ? (
                  <Badge color="primary" size="sm" dot>
                    지금 쓰는 버전
                  </Badge>
                ) : (
                  <Button
                    size="small"
                    variant="outline"
                    color="secondary"
                    iconLeft={<Icon name="settingsBackupRestore" size="sm" />}
                    onClick={() => onRevert(item.versionNo)}
                  >
                    이 버전으로 되돌리기
                  </Button>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </Modal>
  );
};
