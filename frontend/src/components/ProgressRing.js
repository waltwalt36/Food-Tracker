// src/components/ProgressRing.js
import React from "react";

/**
 * Props:
 * - radius: number (e.g. 48)
 * - stroke: number (thickness, e.g. 10)
 * - progress: number (0..1)
 * - className (optional)
 * - children (optional) — shown centered
 */
export default function ProgressRing({
  radius = 48,
  stroke = 8,
  progress = 0,
  className = "",
  children = null,
}) {
  const normalizedProgress = Math.max(0, Math.min(1, progress));
  const normalizedRadius = radius - stroke / 2;
  const circumference = 2 * Math.PI * normalizedRadius;
  const strokeDashoffset = circumference * (1 - normalizedProgress);

  const size = radius * 2;

  return (
    <svg width={size} height={size} className={className} aria-hidden="true">
      <defs>
        <linearGradient id="grad" x1="0%" x2="100%">
          <stop offset="0%" stopColor="#F5A623" />
          <stop offset="100%" stopColor="#7EC88A" />
        </linearGradient>
      </defs>

      {/* background circle */}
      <circle
        stroke="rgba(240, 234, 214, 0.08)"
        fill="transparent"
        strokeWidth={stroke}
        r={normalizedRadius}
        cx={radius}
        cy={radius}
      />

      {/* progress circle */}
      <circle
        stroke="url(#grad)"
        fill="transparent"
        strokeWidth={stroke}
        strokeLinecap="round"
        r={normalizedRadius}
        cx={radius}
        cy={radius}
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        transform={`rotate(-90 ${radius} ${radius})`}
        style={{ transition: "stroke-dashoffset 400ms ease" }}
      />

      {/* center content via foreignObject for flexible layout */}
      <foreignObject
        x={radius - normalizedRadius}
        y={radius - normalizedRadius}
        width={normalizedRadius * 2}
        height={normalizedRadius * 2}
      >
        <div
          xmlns="http://www.w3.org/1999/xhtml"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
          }}
        >
          {children}
        </div>
      </foreignObject>
    </svg>
  );
}
