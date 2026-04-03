import { describe, it, expect } from 'vitest';
import { betaCoordPdf, gaussianPdf, histogram, sampleBetaCoord } from './distributions';
import { seededRng } from './math';

describe('betaCoordPdf', () => {
  it('is zero outside [-1, 1]', () => {
    expect(betaCoordPdf(1.5, 64)).toBe(0);
    expect(betaCoordPdf(-1.0, 64)).toBe(0);
  });

  it('is symmetric around 0', () => {
    expect(betaCoordPdf(0.1, 64)).toBeCloseTo(betaCoordPdf(-0.1, 64), 10);
  });

  it('peaks at 0', () => {
    const atZero = betaCoordPdf(0, 128);
    const atHalf = betaCoordPdf(0.1, 128);
    expect(atZero).toBeGreaterThan(atHalf);
  });

  it('integrates to approximately 1', () => {
    const d = 128;
    const n = 10000;
    const dx = 2 / n;
    let integral = 0;
    for (let i = 0; i < n; i++) {
      const x = -1 + (i + 0.5) * dx;
      integral += betaCoordPdf(x, d) * dx;
    }
    expect(integral).toBeCloseTo(1, 1);
  });

  it('gets narrower with increasing dimension', () => {
    const low = betaCoordPdf(0.2, 16);
    const high = betaCoordPdf(0.2, 256);
    // At x=0.2, higher dimension should have lower density (narrower peak)
    expect(high).toBeLessThan(low);
  });
});

describe('gaussianPdf', () => {
  it('peaks at the mean', () => {
    const peak = gaussianPdf(5, 5, 1);
    const off = gaussianPdf(6, 5, 1);
    expect(peak).toBeGreaterThan(off);
  });

  it('is symmetric', () => {
    expect(gaussianPdf(3, 5, 1)).toBeCloseTo(gaussianPdf(7, 5, 1), 10);
  });

  it('standard normal at 0 ≈ 0.3989', () => {
    expect(gaussianPdf(0, 0, 1)).toBeCloseTo(0.3989, 3);
  });
});

describe('histogram', () => {
  it('counts values into bins', () => {
    const data = [0.1, 0.2, 0.3, 0.6, 0.7, 0.9];
    const { counts, edges } = histogram(data, 2, [0, 1]);
    expect(edges).toEqual([0, 0.5, 1]);
    expect(counts[0]).toBe(3); // 0.1, 0.2, 0.3
    expect(counts[1]).toBe(3); // 0.6, 0.7, 0.9
  });

  it('puts boundary values in correct bin', () => {
    const data = [0, 0.5, 1.0];
    const { counts } = histogram(data, 2, [0, 1]);
    // 0 → bin 0, 0.5 → bin 1, 1.0 → bin 1 (clamped)
    expect(counts[0]).toBe(1);
    expect(counts[1]).toBe(2);
  });

  it('total count equals data length', () => {
    const data = Array.from({ length: 100 }, (_, i) => i / 100);
    const { counts } = histogram(data, 10, [0, 1]);
    const total = counts.reduce((a, b) => a + b, 0);
    expect(total).toBe(100);
  });

  it('returns correct number of bins and edges', () => {
    const { counts, edges } = histogram([1, 2, 3], 5, [0, 10]);
    expect(counts.length).toBe(5);
    expect(edges.length).toBe(6);
  });
});

describe('sampleBetaCoord', () => {
  it('returns the requested number of samples', () => {
    const samples = sampleBetaCoord(64, 100, seededRng(42));
    expect(samples.length).toBe(100);
  });

  it('all samples are in [-1, 1]', () => {
    const samples = sampleBetaCoord(32, 500, seededRng(42));
    for (const s of samples) {
      expect(s).toBeGreaterThanOrEqual(-1);
      expect(s).toBeLessThanOrEqual(1);
    }
  });

  it('produces deterministic output with same seed', () => {
    const a = sampleBetaCoord(64, 10, seededRng(99));
    const b = sampleBetaCoord(64, 10, seededRng(99));
    expect(a).toEqual(b);
  });
});
