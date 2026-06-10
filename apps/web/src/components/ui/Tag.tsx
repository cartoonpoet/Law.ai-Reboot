const DS_TAG = {
  primary:   { tint: "#2151ec14", strong: "#1739a5" },
  success:   { tint: "#1f8a5214", strong: "#006d38" },
  danger:    { tint: "#d23b3b14", strong: "#b12a30" },
  warning:   { tint: "#b8801a1c", strong: "#8a5a00" },
  info:      { tint: "#0e7c8c14", strong: "#006876" },
  secondary: { tint: "#6b748814", strong: "#3d4658" },
  neutral:   { tint: "#eef0f4",   strong: "#6b7488" },
} as const;

type TagColor = keyof typeof DS_TAG;

interface TagProps {
  color?: TagColor;
  children: React.ReactNode;
}

export function Tag({ color = "neutral", children }: TagProps) {
  const c = DS_TAG[color] ?? DS_TAG.neutral;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "1px 7px",
        borderRadius: 4,
        fontSize: 11.5,
        fontWeight: 600,
        whiteSpace: "nowrap",
        fontFamily: "Pretendard",
        background: c.tint,
        color: c.strong,
      }}
    >
      {children}
    </span>
  );
}
