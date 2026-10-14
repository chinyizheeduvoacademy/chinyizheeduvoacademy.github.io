"use client";

import { useId } from "react";

interface ProgressRingProps {
  /** Completion percentage, clamped to [0, 100]. */
  pct: number;
  /** Diameter in px. Defaults to 56. */
  size?: number;
  /** Stroke width in px. Defaults to 4. */
  strokeWidth?: number;
  /** Show a numeric label inside the ring. */
  showLabel?: boolean;
  /** Override the label text (e.g. "5/6"). */
  label?: string;
  className?: string;
}

/**
 * Circular SVG progress indicator with an emerald gradient stroke.
 * Used on path cards (compact) and path-detail header (large).
 */
export function ProgressRing({
  pct,
  size = 56,
  strokeWidth = 4,
  showLabel = true,
  label,
  className,
}: ProgressRingProps) {
  const rawId = useId();
  const gradientId = `fs-ring-${rawId.replace(/[:]/g, "")}`;

  const clamped = Math.max(0, Math.min(100, pct));
  const r = Math.max(1, (size - strokeWidth) / 2);
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      role="img"
      aria-label={`Progress: ${Math.round(clamped)} percent`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="oklch(0.85 0.18 162)" />
          <stop offset="100%" stopColor="oklch(0.7 0.16 175)" />
        </linearGradient>
      </defs>
      {/* Track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="oklch(1 0 0 / 8%)"
        strokeWidth={strokeWidth}
      />
      {/* Indicator */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{
          transition:
            "stroke-dashoffset 600ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      />
      {showLabel && (
        <text
          x="50%"
          y="50%"
          dy="0.35em"
          textAnchor="middle"
          fontSize={Math.max(8, size * 0.26)}
          className="fs-mono fill-foreground"
          fontWeight={600}
        >
          {label ?? `${Math.round(clamped)}%`}
        </text>
      )}
    </svg>
  );
}
