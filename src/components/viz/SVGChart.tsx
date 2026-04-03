import type { ReactNode } from 'react';

interface Padding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

interface SVGChartProps {
  width: number;
  height: number;
  padding?: Padding;
  children: ReactNode;
  className?: string;
}

const defaultPadding: Padding = { top: 20, right: 20, bottom: 40, left: 50 };

export function SVGChart({
  width,
  height,
  padding = defaultPadding,
  children,
  className = '',
}: SVGChartProps) {
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={`w-full ${className}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <g transform={`translate(${padding.left},${padding.top})`}>
        {/* axes */}
        <line x1={0} y1={innerH} x2={innerW} y2={innerH} stroke="#d1d5db" strokeWidth={1} />
        <line x1={0} y1={0} x2={0} y2={innerH} stroke="#d1d5db" strokeWidth={1} />
        {children}
      </g>
    </svg>
  );
}

export { defaultPadding };
export type { Padding };
