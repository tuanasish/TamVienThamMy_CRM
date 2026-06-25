import React from "react";
import Image from "next/image";

interface LogoProps {
  size?: "small" | "medium" | "large";
}

export default function Logo({ size = "medium" }: LogoProps) {
  const isSmall = size === "small";
  const isLarge = size === "large";

  // Aspect ratio is 4:3 (577 x 433)
  const height = isSmall ? 42 : isLarge ? 135 : 90;
  const width = isSmall ? 56 : isLarge ? 180 : 120;

  return (
    <div style={{ display: "inline-flex", justifyContent: "center", alignItems: "center", userSelect: "none" }}>
      <Image
        src="/logo.png"
        alt="Tấm Viện Thẩm Mỹ Logo"
        width={width}
        height={height}
        style={{ objectFit: "contain" }}
        priority
      />
    </div>
  );
}
