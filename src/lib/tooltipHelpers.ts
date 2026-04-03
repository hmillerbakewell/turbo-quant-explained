/**
 * Given a mouse X position over a histogram Canvas2D, find the bin and return tooltip content.
 * Returns null if the mouse is outside the plot area.
 */
export function histogramTooltip(
  mouseX: number,
  canvasWidth: number,
  pad: number,
  bins: number,
  range: [number, number],
  counts: number[],
  unit: string = 'items'
): string | null {
  const plotW = canvasWidth - 2 * pad;
  const relX = mouseX - pad;
  if (relX < 0 || relX > plotW) return null;

  const binIdx = Math.floor((relX / plotW) * bins);
  if (binIdx < 0 || binIdx >= counts.length) return null;

  const step = (range[1] - range[0]) / bins;
  const lo = range[0] + binIdx * step;
  const hi = lo + step;

  return `[${lo.toFixed(3)}, ${hi.toFixed(3)}): ${counts[binIdx]} ${unit}`;
}
