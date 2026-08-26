import type { SVGProps } from "react";

export function AntonixIcon({
  size = 38,
  className,
  ...props
}: { size?: number; className?: string } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={(size * 88) / 100}
      viewBox="0 0 120 105"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0 }}
      {...props}
    >
      {/* Top Left Bar */}
      <polygon points="46,12 86,12 70,42 30,42" fill="#0052cc" />
      {/* Top Right Triangle */}
      <polygon points="90,12 110,12 90,42" fill="#002d62" />

      {/* Middle Cyan Left Polygon */}
      <polygon points="12,42 66,42 50,72 26,72" fill="#0080ff" />
      {/* Middle Cyan Right Triangle/Polygon */}
      <polygon points="68,42 114,72 70,72" fill="#00a3ff" />

      {/* Bottom Left Navy Triangle */}
      <polygon points="34,72 16,102 46,102" fill="#002d62" />
      {/* Bottom Right Blue Bar */}
      <polygon points="52,72 92,72 76,102 36,102" fill="#0052cc" />
    </svg>
  );
}

export function AntonixFullLogo({
  height = 42,
  className,
}: {
  height?: number;
  className?: string;
}) {
  return (
    <img
      src="/logo.png"
      alt="ANTONIX"
      className={className}
      style={{
        height: `${height}px`,
        width: "auto",
        objectFit: "contain",
        display: "inline-block",
        verticalAlign: "middle",
      }}
    />
  );
}
