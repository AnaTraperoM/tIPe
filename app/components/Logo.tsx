"use client";

interface Props {
  size?: number;
}

/**
 * tIPe logo — geometric grid of 5 rounded blue rectangles.
 * Uses the actual logo image file.
 */
export default function Logo({ size = 24 }: Props) {
  return (
    <img
      src="/logo.png"
      alt="tIPe logo"
      height={size}
      style={{ height: size, width: "auto" }}
    />
  );
}
