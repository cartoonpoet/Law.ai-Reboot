import { useId } from "react";

/**
 * Law.ai Prism 마크 (시안 logo-fit.html 4번).
 * 한 페이지에 여러 번 렌더될 수 있어 useId로 그라디언트 ID를 유니크하게 만든다.
 */
export function Logo({ size = 28 }: { size?: number }) {
  const uid = useId();
  const a = `${uid}-a`;
  const b = `${uid}-b`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      aria-hidden="true"
      focusable="false"
      style={{ display: "block", flexShrink: 0 }}
    >
      <defs>
        <linearGradient id={a} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6f9bff" />
          <stop offset="1" stopColor="#2151ec" />
        </linearGradient>
        <linearGradient id={b} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1c46c9" />
          <stop offset="1" stopColor="#15349e" />
        </linearGradient>
      </defs>
      <path d="M16 10 L24 10 L24 32 L16 28 Z" fill={`url(#${a})`} />
      <path d="M16 28 L24 32 L36 32 L36 38 L16 38 Z" fill={`url(#${b})`} />
    </svg>
  );
}
