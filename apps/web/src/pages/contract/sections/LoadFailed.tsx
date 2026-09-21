import { Button, EmptyState, Icon } from "@lawkit/ui";

interface LoadFailedProps {
  /** 무엇을 못 불러왔는지 — 예: "양식을 불러오지 못했어요" */
  title?: string;
  description?: string;
  onRetry: () => void;
}

const DEFAULT_TITLE = "양식을 불러오지 못했어요";
const DEFAULT_DESCRIPTION = "잠시 뒤 다시 시도해 주세요. 계속 안 되면 관리자에게 알려 주세요.";

/** 불러오기 실패 안내 + 다시 시도 — 표준양식 목록·편집기가 같은 모양을 쓴다. */
export const LoadFailed = ({ title = DEFAULT_TITLE, description = DEFAULT_DESCRIPTION, onRetry }: LoadFailedProps) => (
  <EmptyState
    icon={<Icon name="alertTriangle" size="lg" />}
    title={title}
    description={description}
    action={
      <Button type="button" variant="outline" color="secondary" iconLeft={<Icon name="rotateCw" size="sm" />} onClick={onRetry}>
        다시 시도
      </Button>
    }
  />
);
