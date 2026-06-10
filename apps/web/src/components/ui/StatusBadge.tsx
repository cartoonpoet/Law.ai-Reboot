import { Badge } from "./Badge";

const STATUS_COLOR: Record<string, "primary" | "success" | "danger" | "warning" | "info" | "secondary"> = {
  "임시 저장": "secondary",
  "미배정": "danger",
  "배정 중": "secondary",
  "법무 검토 중": "primary",
  "요청자 검토 중": "info",
  "검토 완료": "success",
  "체결 진행": "warning",
  "체결 완료": "success",
};

interface StatusBadgeProps {
  status: string;
  size?: "sm" | "md";
}

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  return (
    <Badge color={STATUS_COLOR[status] ?? "secondary"} size={size} dot>
      {status}
    </Badge>
  );
}
