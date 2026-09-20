import { Icon } from "@lawkit/ui";
import * as css from "./documentEditorMock.css";

/** 사이드바 "계약 관리" 아래에 새 메뉴가 들어갈 자리. 실제 메뉴 연결은 채택 후에 한다. */
const NAV_ITEMS: { id: string; label: string; icon: "filePlus" | "fileFind" | "calendar" | "fileText"; isNew?: boolean }[] = [
  { id: "c-request", label: "계약서 검토 요청", icon: "filePlus" },
  { id: "c-list", label: "계약 조회", icon: "fileFind" },
  { id: "c-template", label: "표준양식 관리", icon: "fileText", isNew: true },
  { id: "c-expiring", label: "만료 관리", icon: "calendar" },
];

/** 새 메뉴가 사이드바 어디에 붙는지 보여 주는 안내 블록. */
export const NavPlacementNote = () => (
  <div className={css.navPreview}>
    <div className={css.navPreviewBox}>
      <div className={css.navPreviewLabel}>계약 관리</div>
      {NAV_ITEMS.map((item) => (
        <div
          key={item.id}
          className={item.isNew ? `${css.navPreviewItem} ${css.navPreviewItemNew}` : css.navPreviewItem}
        >
          <Icon name={item.icon} size="sm" className={css.navPreviewIcon} />
          {item.label}
          {item.isNew && <span className={css.navPreviewNew}>새 메뉴</span>}
        </div>
      ))}
    </div>

    <div className={css.navPreviewText}>
      <div className={css.navPreviewTitle}>메뉴 자리 — 계약 관리 &gt; 표준양식 관리</div>
      회사가 쓰는 표준 계약서 양식을 만들고 고치는 메뉴입니다. 계약 조회 바로 아래, 만료 관리 위에 둡니다.
      <br />
      업무 통계와 같은 방식으로 <b>법무팀(사내변호사)과 시스템 관리자에게만</b> 보이고, 다른 사람에게는 메뉴 자체가 나타나지 않습니다.
      양식을 골라 계약서를 쓰는 것은 계약 작성 권한이 있으면 누구나 할 수 있습니다.
    </div>
  </div>
);
