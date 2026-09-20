import { Button, Callout, Icon, Modal } from "@lawkit/ui";
import { Badge } from "../../../components/ui/Badge";
import { MOCK_VERSIONS } from "./documentEditorMockData";
import * as css from "./documentEditorMock.css";

interface VersionHistoryModalProps {
  onClose: () => void;
}

/** 4. 버전 이력 모달 — 저장할 때마다 쌓인 버전을 보고, 옛 버전으로 되돌린다. */
export const VersionHistoryModal = ({ onClose }: VersionHistoryModalProps) => {
  const currentNo = MOCK_VERSIONS[0].versionNo;

  return (
    <Modal
      open
      onClose={onClose}
      size="large"
      title="버전 이력 — 비밀유지계약서(NDA) 표준"
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
        {MOCK_VERSIONS.map((item) => {
          const isCurrent = item.versionNo === currentNo;
          return (
            <div key={item.versionNo} className={isCurrent ? `${css.verRow} ${css.verRowNow}` : css.verRow}>
              <span className={css.verNo}>v{item.versionNo}</span>
              <span className={css.verMain}>
                <span className={css.verMeta}>
                  {item.savedAt} · {item.savedBy}
                </span>
                <span className={css.verNote}>{item.note}</span>
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
