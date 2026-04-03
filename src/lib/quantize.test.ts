import { describe, it, expect } from 'vitest';
import { getCodebook, scalarQuantize, scalarDequantize, qjlQuantize, qjlDequantize } from './quantize';

describe('getCodebook (Lloyd-Max)', () => {
  it('returns 2 centroids for 1-bit', () => {
    const cb = getCodebook(1);
    expect(cb.centroids.length).toBe(2);
    expect(cb.boundaries.length).toBe(1);
  });

  it('returns 4 centroids for 2-bit', () => {
    const cb = getCodebook(2);
    expect(cb.centroids.length).toBe(4);
    expect(cb.boundaries.length).toBe(3);
  });

  it('returns 2^b centroids for arbitrary bit-width', () => {
    for (let b = 1; b <= 4; b++) {
      const cb = getCodebook(b);
      expect(cb.centroids.length).toBe(Math.pow(2, b));
      expect(cb.boundaries.length).toBe(Math.pow(2, b) - 1);
    }
  });

  it('centroids are sorted in ascending order', () => {
    for (let b = 1; b <= 4; b++) {
      const cb = getCodebook(b);
      for (let i = 1; i < cb.centroids.length; i++) {
        expect(cb.centroids[i]).toBeGreaterThan(cb.centroids[i - 1]);
      }
    }
  });

  it('boundaries are between consecutive centroids', () => {
    for (let b = 1; b <= 4; b++) {
      const cb = getCodebook(b);
      for (let i = 0; i < cb.boundaries.length; i++) {
        expect(cb.boundaries[i]).toBeGreaterThan(cb.centroids[i]);
        expect(cb.boundaries[i]).toBeLessThan(cb.centroids[i + 1]);
      }
    }
  });

  it('1-bit centroids are symmetric around 0', () => {
    const cb = getCodebook(1);
    expect(cb.centroids[0]).toBeCloseTo(-cb.centroids[1], 6);
    expect(cb.boundaries[0]).toBeCloseTo(0, 6);
  });

  it('all centroids are within [-1, 1]', () => {
    for (let b = 1; b <= 4; b++) {
      const cb = getCodebook(b);
      for (const c of cb.centroids) {
        expect(c).toBeGreaterThanOrEqual(-1);
        expect(c).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('scalarQuantize', () => {
  it('maps value to nearest centroid index', () => {
    const cb = getCodebook(1);
    // Negative values should map to centroid 0, positive to centroid 1
    expect(scalarQuantize(-0.5, cb)).toBe(0);
    expect(scalarQuantize(0.5, cb)).toBe(1);
  });

  it('quantize then dequantize returns a centroid value', () => {
    const cb = getCodebook(2);
    const idx = scalarQuantize(0.1, cb);
    const recon = scalarDequantize(idx, cb);
    expect(cb.centroids).toContain(recon);
  });

  it('average round-trip error decreases with more bits', () => {
    let prevAvgError = Infinity;
    for (let b = 1; b <= 4; b++) {
      const cb = getCodebook(b);
      let totalError = 0;
      const n = 100;
      for (let i = 0; i < n; i++) {
        const x = -0.3 + (0.6 * i) / (n - 1); // test over [-0.3, 0.3]
        const idx = scalarQuantize(x, cb);
        const recon = scalarDequantize(idx, cb);
        totalError += (x - recon) ** 2;
      }
      const avgError = totalError / n;
      expect(avgError).toBeLessThan(prevAvgError);
      prevAvgError = avgError;
    }
  });
});

describe('scalarDequantize', () => {
  it('returns the centroid at the given index', () => {
    const cb = getCodebook(2);
    for (let i = 0; i < cb.centroids.length; i++) {
      expect(scalarDequantize(i, cb)).toBe(cb.centroids[i]);
    }
  });
});

describe('qjlQuantize', () => {
  it('returns {-1, +1} values', () => {
    const S = [[1, 0], [0, 1]];
    const signs = qjlQuantize([0.5, -0.3], S);
    for (const s of signs) {
      expect(Math.abs(s)).toBe(1);
    }
  });

  it('sign(S·r) is correct for identity projection', () => {
    const S = [[1, 0], [0, 1]];
    const signs = qjlQuantize([0.5, -0.3], S);
    expect(signs[0]).toBe(1);  // 0.5 >= 0
    expect(signs[1]).toBe(-1); // -0.3 < 0
  });

  it('output length equals number of rows in S', () => {
    const d = 8;
    const S = Array.from({ length: d }, (_, i) =>
      Array.from({ length: d }, (_, j) => (i === j ? 1 : 0))
    );
    const r = Array.from({ length: d }, () => Math.random() - 0.5);
    const signs = qjlQuantize(r, S);
    expect(signs.length).toBe(d);
  });
});

describe('qjlDequantize', () => {
  it('produces a vector of the correct dimension', () => {
    const d = 4;
    const S = Array.from({ length: d }, (_, i) =>
      Array.from({ length: d }, (_, j) => (i === j ? 1 : 0))
    );
    const signs = [1, -1, 1, -1];
    const result = qjlDequantize(signs, S, 1.0, d);
    expect(result.length).toBe(d);
  });

  it('scales by gamma', () => {
    const d = 2;
    const S = [[1, 0], [0, 1]];
    const signs = [1, 1];
    const r1 = qjlDequantize(signs, S, 1.0, d);
    const r2 = qjlDequantize(signs, S, 2.0, d);
    // r2 should be 2x r1
    expect(r2[0]).toBeCloseTo(2 * r1[0], 10);
    expect(r2[1]).toBeCloseTo(2 * r1[1], 10);
  });
});
