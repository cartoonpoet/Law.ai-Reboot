import { useVersionCheck } from "./hooks/useVersionCheck";
import * as css from "./newVersionBanner.css";

const handleReload = () => window.location.reload();

/**
 * 새 버전 배포 감지 알림 — 부팅 시점의 __BUILD_ID__ 와 /version.json 폴링 결과가 다르면 노출.
 *
 * - 위치는 화면 하단 중앙(작업을 가리지 않는 자리). main.tsx 루트라 어느 화면에서든 같다.
 * - "새로고침" 클릭 → window.location.reload() — SPA 캐시 무효화 후 새 번들 로드.
 * - 닫기 버튼은 의도적으로 두지 않는다(닫으면 사용자가 옛 버전을 계속 쓰게 됨).
 */
export function NewVersionBanner() {
  const hasNewVersion = useVersionCheck();
  if (!hasNewVersion) return null;
  return (
    <div className={css.wrap} role="status">
      <span className={css.dot} />
      <span className={css.text}>새 버전이 준비됐어요</span>
      <button type="button" className={css.button} onClick={handleReload}>
        새로고침
      </button>
    </div>
  );
}
