import React from "react";

interface LogoProps {
  size?: "small" | "medium" | "large";
}

export default function Logo({ size = "medium" }: LogoProps) {
  const isSmall = size === "small";
  const isLarge = size === "large";

  const brandFontSize = isSmall ? "1.75rem" : isLarge ? "3.2rem" : "2.5rem";
  const subFontSize = isSmall ? "0.55rem" : isLarge ? "0.8rem" : "0.7rem";
  const gap = isSmall ? "2px" : isLarge ? "6px" : "4px";

  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", lineHeight: 1.1, userSelect: "none" }}>
      <span
        style={{
          fontFamily: "'Dancing Script', cursive",
          fontSize: brandFontSize,
          fontWeight: 700,
          background: "var(--grad-premium)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          paddingBottom: "2px",
          display: "block",
        }}
      >
        Tấm
      </span>
      <span
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: subFontSize,
          fontWeight: 700,
          letterSpacing: "0.15em",
          color: "var(--text-secondary)",
          textTransform: "uppercase",
          marginTop: `-${gap}`,
          display: "block",
        }}
      >
        Viện Thẩm Mỹ
      </span>
    </div>
  );
}
