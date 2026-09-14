import { Toast, ToastContainer } from "@lawkit/ui";
import { dismissToast } from "../../lib/toast/toastStore";
import { useToasts } from "../../lib/toast/useToasts";

const TOAST_DURATION_MS = 5000;

/**
 * 전역 토스트 — showToast() 로 쌓인 알림을 우측 상단 lawkit ToastContainer 에 렌더한다.
 * lawkit Toast 는 마운트 시점 props 로 한 번 띄우고, 닫히면 onClose → 저장소에서 제거(언마운트)된다.
 */
export const AppToaster = () => {
  const toasts = useToasts();

  return (
    <ToastContainer position="top-right">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          intent={toast.intent}
          title={toast.title}
          description={toast.description}
          duration={TOAST_DURATION_MS}
          pauseOnHover
          onClose={() => dismissToast(toast.id)}
        />
      ))}
    </ToastContainer>
  );
};
