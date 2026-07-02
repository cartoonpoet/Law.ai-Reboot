interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}

/**
 * 미니 스파크라인 — 추세를 한 줄로. 라인이 좌→우로 그려지는 모션(lawai-spark).
 */
export function Sparkline({
  data,
  width = 72,
  height = 24,
  color = "#3b82f6",
}: SparklineProps) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const span = max - min || 1;
  const pad = 2;
  const pts = data.map((d, i) => {
    const x = pad + (i / (data.length - 1)) * (width - pad * 2);
    const y = pad + (1 - (d - min) / span) * (height - pad * 2);
    return [x, y] as const;
  });
  const path = pts
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ");
  // 대략적 path 길이(애니메이션 dash 용) — 폭 기준 근사.
  const sparkLen = width * 1.6;
  const [lastX, lastY] = pts[pts.length - 1];
  const up = data[data.length - 1] >= data[0];

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <path
        className="lawai-spark"
        d={path}
        fill="none"
        stroke={up ? color : "#ef4444"}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ ["--spark-len" as string]: String(sparkLen) }}
      />
      <circle cx={lastX} cy={lastY} r={2} fill={up ? color : "#ef4444"} />
    </svg>
  );
}
