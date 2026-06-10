const DS = {
  primary:   { base: "#2151ec", strong: "#1739a5", tint: "#2151ec14" },
  success:   { base: "#1f8a52", strong: "#006d38", tint: "#1f8a5214" },
  danger:    { base: "#d23b3b", strong: "#b12a30", tint: "#d23b3b14" },
  warning:   { base: "#b8801a", strong: "#8a5a00", tint: "#b8801a1c" },
  info:      { base: "#0e7c8c", strong: "#006876", tint: "#0e7c8c14" },
  secondary: { base: "#6b7488", strong: "#3d4658", tint: "#6b748814" },
} as const;

type BadgeColor = keyof typeof DS;

interface BadgeProps {
  color?: BadgeColor;
  size?: "sm" | "md";
  dot?: boolean;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export function Badge({ color = "secondary", size = "md", dot = false, children, style }: BadgeProps) {
  const c = DS[color] ?? DS.secondary;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: size === "sm" ? "2px 8px" : "3px 10px",
        fontSize: size === "sm" ? 11.5 : 12,
        borderRadius: 5,
        fontWeight: 600,
        whiteSpace: "nowrap",
        background: c.tint,
        color: c.strong,
        fontFamily: "Pretendard",
        ...style,
      }}
    >
      {dot && (
        <span
          style={{
            width: 5,
            height: 5,
            borderRadius: 1.5,
            background: c.base,
            flexShrink: 0,
          }}
        />
      )}
      {children}
    </span>
  );
}
