import { describe, it, expect } from 'vitest';
import { histogramTooltip } from './tooltipHelpers';

describe('histogramTooltip', () => {
  const counts = [5, 10, 3, 8, 2];
  const range: [number, number] = [0, 1];
  const pad = 20;
  const width = 220; // plotW = 220 - 2*20 = 180

  it('returns null when mouse is in left padding', () => {
    expect(histogramTooltip(10, width, pad, 5, range, counts)).toBeNull();
  });

  it('returns null when mouse is in right padding', () => {
    expect(histogramTooltip(210, width, pad, 5, range, counts)).toBeNull();
  });

  it('returns correct bin for first bar', () => {
    // First bin: x in [pad, pad + plotW/5) = [20, 56)
    const tip = histogramTooltip(25, width, pad, 5, range, counts, 'items');
    expect(tip).not.toBeNull();
    expect(tip).toContain('5 items');
    expect(tip).toContain('[0.000');
  });

  it('returns correct bin for middle bar', () => {
    // Third bin (index 2): x in [pad + 2*plotW/5, pad + 3*plotW/5) = [92, 128)
    const tip = histogramTooltip(100, width, pad, 5, range, counts, 'trials');
    expect(tip).not.toBeNull();
    expect(tip).toContain('3 trials');
  });

  it('returns correct bin for last bar', () => {
    // Last bin: x in [pad + 4*plotW/5, pad + plotW) = [164, 200)
    const tip = histogramTooltip(170, width, pad, 5, range, counts, 'coords');
    expect(tip).not.toBeNull();
    expect(tip).toContain('2 coords');
  });

  it('uses default unit "items"', () => {
    const tip = histogramTooltip(25, width, pad, 5, range, counts);
    expect(tip).toContain('items');
  });

  it('shows correct range for negative ranges', () => {
    const negRange: [number, number] = [-0.5, 0.5];
    const negCounts = [3, 7];
    const tip = histogramTooltip(pad + 10, 200, pad, 2, negRange, negCounts);
    expect(tip).not.toBeNull();
    expect(tip).toContain('-0.500');
  });
});
