"use client";

import { useState } from "react";

export interface DataPoint {
  label: string;
  value: number;
  secondaryValue?: number;
}

interface TrendChartProps {
  data: DataPoint[];
  title: string;
  subtitle?: string;
  primaryLabel: string;
  secondaryLabel?: string;
  primaryColor?: string;
  secondaryColor?: string;
  valuePrefix?: string;
  valueSuffix?: string;
  height?: number;
}

export function TrendChart({
  data,
  title,
  subtitle,
  primaryLabel,
  secondaryLabel,
  primaryColor = "#0080ff",
  secondaryColor = "#0047ab",
  valuePrefix = "",
  valueSuffix = "",
  height = 240,
}: TrendChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data.length) return null;

  const primaryValues = data.map((d) => d.value);
  const secondaryValues = data.map((d) => d.secondaryValue ?? 0);
  const hasSecondary = data.some((d) => d.secondaryValue !== undefined);

  const allValues = hasSecondary ? [...primaryValues, ...secondaryValues] : primaryValues;
  const minVal = Math.min(...allValues, 0);
  const maxVal = Math.max(...allValues, 1) * 1.15;

  const width = 700;
  const paddingX = 45;
  const paddingTop = 25;
  const paddingBottom = 35;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingTop - paddingBottom;

  const getX = (index: number) => paddingX + (index / (data.length - 1)) * chartWidth;
  const getY = (val: number) => paddingTop + chartHeight - ((val - minVal) / (maxVal - minVal)) * chartHeight;

  // Generate primary smooth path
  const primaryPoints = data.map((d, i) => `${getX(i)},${getY(d.value)}`);
  const primaryPathD = `M ${primaryPoints.join(" L ")}`;
  const primaryAreaD = `M ${getX(0)},${getY(minVal)} L ${primaryPoints.join(" L ")} L ${getX(data.length - 1)},${getY(minVal)} Z`;

  // Generate secondary path if present
  const secondaryPoints = hasSecondary ? data.map((d, i) => `${getX(i)},${getY(d.secondaryValue ?? 0)}`) : [];
  const secondaryPathD = hasSecondary ? `M ${secondaryPoints.join(" L ")}` : "";
  const secondaryAreaD = hasSecondary
    ? `M ${getX(0)},${getY(minVal)} L ${secondaryPoints.join(" L ")} L ${getX(data.length - 1)},${getY(minVal)} Z`
    : "";

  return (
    <div style={{ width: "100%", background: "var(--surface)", borderRadius: "var(--radius-lg)", border: "1px solid var(--line)", padding: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "var(--ink)" }}>{title}</h3>
          {subtitle && <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.825rem", color: "var(--muted)" }}>{subtitle}</p>}
        </div>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center", fontSize: "0.78rem", fontWeight: 700 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: primaryColor }} />
            <span style={{ color: "var(--ink)" }}>{primaryLabel}</span>
          </div>
          {hasSecondary && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: secondaryColor }} />
              <span style={{ color: "var(--accent)" }}>{secondaryLabel}</span>
            </div>
          )}
        </div>
      </div>

      <div style={{ position: "relative", width: "100%", overflow: "hidden" }}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "auto", display: "block" }}>
          <defs>
            <linearGradient id={`grad-primary-${title.replace(/\s+/g, "")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={primaryColor} stopOpacity="0.28" />
              <stop offset="100%" stopColor={primaryColor} stopOpacity="0.01" />
            </linearGradient>
            {hasSecondary && (
              <linearGradient id={`grad-secondary-${title.replace(/\s+/g, "")}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={secondaryColor} stopOpacity="0.22" />
                <stop offset="100%" stopColor={secondaryColor} stopOpacity="0.01" />
              </linearGradient>
            )}
          </defs>

          {/* Horizontal Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
            const y = paddingTop + chartHeight * (1 - pct);
            const val = minVal + (maxVal - minVal) * pct;
            return (
              <g key={i}>
                <line x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3 3" />
                <text x={paddingX - 8} y={y + 3} textAnchor="end" fontSize="10" fill="var(--muted)" fontFamily="sans-serif">
                  {valuePrefix}{val >= 10 ? Math.round(val) : val.toFixed(1)}{valueSuffix}
                </text>
              </g>
            );
          })}

          {/* Secondary Area & Line */}
          {hasSecondary && (
            <>
              <path d={secondaryAreaD} fill={`url(#grad-secondary-${title.replace(/\s+/g, "")})`} />
              <path d={secondaryPathD} fill="none" stroke={secondaryColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </>
          )}

          {/* Primary Area & Line */}
          <path d={primaryAreaD} fill={`url(#grad-primary-${title.replace(/\s+/g, "")})`} />
          <path d={primaryPathD} fill="none" stroke={primaryColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Interactive Data Points & Vertical Guide */}
          {data.map((d, i) => {
            const x = getX(i);
            const yPrimary = getY(d.value);
            const isHovered = hoveredIdx === i;

            return (
              <g key={i} onMouseEnter={() => setHoveredIdx(i)} onMouseLeave={() => setHoveredIdx(null)} style={{ cursor: "pointer" }}>
                {isHovered && (
                  <line x1={x} y1={paddingTop} x2={x} y2={paddingTop + chartHeight} stroke="var(--line)" strokeWidth="1.5" strokeDasharray="2 2" />
                )}

                {/* Secondary Dot */}
                {hasSecondary && d.secondaryValue !== undefined && (
                  <circle cx={x} cy={getY(d.secondaryValue)} r={isHovered ? "5.5" : "3.5"} fill="var(--surface)" stroke={secondaryColor} strokeWidth="2" />
                )}

                {/* Primary Dot */}
                <circle cx={x} cy={yPrimary} r={isHovered ? "6" : "4"} fill="var(--surface)" stroke={primaryColor} strokeWidth="2.5" />

                {/* X Axis Labels */}
                <text x={x} y={height - 10} textAnchor="middle" fontSize="11" fill={isHovered ? "var(--ink)" : "var(--muted)"} fontWeight={isHovered ? "700" : "500"} fontFamily="sans-serif">
                  {d.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredIdx !== null && (
          <div
            style={{
              position: "absolute",
              top: "10px",
              left: `${(getX(hoveredIdx) / width) * 100}%`,
              transform: "translateX(-50%)",
              background: "var(--ink)",
              color: "#ffffff",
              padding: "0.4rem 0.75rem",
              borderRadius: "6px",
              fontSize: "0.75rem",
              pointerEvents: "none",
              whiteSpace: "nowrap",
              boxShadow: "0 4px 12px rgba(7, 19, 36, 0.25)",
              zIndex: 10,
            }}
          >
            <div style={{ fontWeight: 700, borderBottom: "1px solid rgba(255,255,255,0.15)", paddingBottom: "0.2rem", marginBottom: "0.2rem" }}>
              {data[hoveredIdx].label}
            </div>
            <div>
              {primaryLabel}: <strong>{valuePrefix}{data[hoveredIdx].value}{valueSuffix}</strong>
            </div>
            {hasSecondary && data[hoveredIdx].secondaryValue !== undefined && (
              <div style={{ color: "#93c5fd" }}>
                {secondaryLabel}: <strong>{valuePrefix}{data[hoveredIdx].secondaryValue}{valueSuffix}</strong>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
