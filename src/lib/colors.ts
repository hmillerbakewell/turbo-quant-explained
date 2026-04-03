export const COLORS = {
  primary: '#6366f1',     // indigo-500
  secondary: '#8b5cf6',   // violet-500
  accent: '#f59e0b',      // amber-500
  grid: '#e5e7eb',        // gray-200
  text: '#374151',        // gray-700
  muted: '#9ca3af',       // gray-400
  bg: '#f9fafb',          // gray-50
  red: '#ef4444',
  green: '#22c55e',
  blue: '#3b82f6',
  orange: '#f97316',
} as const;

/** Interpolate between two hex colors. */
export function lerpColor(a: string, b: string, t: number): string {
  const parse = (hex: string) => [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
  const ca = parse(a);
  const cb = parse(b);
  const r = Math.round(ca[0] + (cb[0] - ca[0]) * t);
  const g = Math.round(ca[1] + (cb[1] - ca[1]) * t);
  const bl = Math.round(ca[2] + (cb[2] - ca[2]) * t);
  return `rgb(${r},${g},${bl})`;
}
