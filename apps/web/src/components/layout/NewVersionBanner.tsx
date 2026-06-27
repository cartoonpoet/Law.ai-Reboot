import { Alert } from "@lawkit/ui";
import { useVersionCheck } from "./hooks/useVersionCheck";
import * as css from "./newVersionBanner.css";

const handleReload = () => window.location.reload();

/**
 * 새 버전 배포 감지 배너 — 부팅 시점의 __BUILD_ID__ 와 /version.json 폴링 결과가 다르면 노출.
 *
 * - 위치는 main.tsx 루트(라우트 위). 로그인/대시보드/계약 어디서든 같은 배너.
 * - "새로고침" 클릭 → window.location.reload() — SPA 캐시 무효화 후 새 번들 로드.
 * - 닫기 버튼은 의도적으로 두지 않는다(닫으면 사용자가 옛 버전을 계속 쓰게 됨).
 */
export function NewVersionBanner() {
  const hasNewVersion = useVersionCheck();
  if (!hasNewVersion) return null;
  return (
    <div className={css.wrap}>
      <div className={css.inner}>
        <Alert
          type="info"
          size="small"
          actions={[
            { label: "새로고침", intent: "primary", onClick: handleReload },
          ]}
        >
          새 버전이 배포되었습니다. 새로고침하여 최신 버전으로 업데이트하세요.
        </Alert>
      </div>
    </div>
  );
}
