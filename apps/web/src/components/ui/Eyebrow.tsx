import { T } from "../../design/tokens";

export function Eyebrow({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: T.faint, letterSpacing: "0.07em", textTransform: "uppercase", ...style }}>
      {children}
    </div>
  );
}
