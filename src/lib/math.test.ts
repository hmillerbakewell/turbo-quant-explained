import { describe, it, expect } from 'vitest';
import {
  dot, norm, normalize, scale, add, sub,
  matmul, transpose, randomOrthogonal, rotation2D,
  linspace, clamp, seededRng,
} from './math';

describe('dot', () => {
  it('computes dot product of two vectors', () => {
    expect(dot([1, 2, 3], [4, 5, 6])).toBe(32);
  });

  it('returns 0 for orthogonal vectors', () => {
    expect(dot([1, 0], [0, 1])).toBe(0);
  });
});

describe('norm', () => {
  it('computes L2 norm', () => {
    expect(norm([3, 4])).toBe(5);
  });

  it('returns 0 for zero vector', () => {
    expect(norm([0, 0, 0])).toBe(0);
  });
});

describe('normalize', () => {
  it('returns unit vector', () => {
    const v = normalize([3, 4]);
    expect(norm(v)).toBeCloseTo(1, 10);
  });

  it('preserves direction', () => {
    const v = normalize([6, 0]);
    expect(v[0]).toBeCloseTo(1);
    expect(v[1]).toBeCloseTo(0);
  });

  it('handles zero vector without NaN', () => {
    const v = normalize([0, 0]);
    expect(v).toEqual([0, 0]);
  });
});

describe('scale / add / sub', () => {
  it('scales a vector', () => {
    expect(scale([1, 2], 3)).toEqual([3, 6]);
  });

  it('adds two vectors', () => {
    expect(add([1, 2], [3, 4])).toEqual([4, 6]);
  });

  it('subtracts two vectors', () => {
    expect(sub([5, 3], [1, 2])).toEqual([4, 1]);
  });
});

describe('matmul', () => {
  it('multiplies matrix by vector', () => {
    const M = [[1, 0], [0, 1]];
    expect(matmul(M, [3, 4])).toEqual([3, 4]);
  });

  it('applies rotation', () => {
    const R = [[0, -1], [1, 0]]; // 90° rotation
    const result = matmul(R, [1, 0]);
    expect(result[0]).toBeCloseTo(0);
    expect(result[1]).toBeCloseTo(1);
  });
});

describe('transpose', () => {
  it('transposes a matrix', () => {
    const M = [[1, 2], [3, 4], [5, 6]];
    const T = transpose(M);
    expect(T).toEqual([[1, 3, 5], [2, 4, 6]]);
  });
});

describe('randomOrthogonal', () => {
  it('produces an orthogonal matrix (rows are orthonormal)', () => {
    const d = 8;
    const Q = randomOrthogonal(d, seededRng(42));

    // Check that rows are orthonormal: Q[i] · Q[j] = δ_{ij}
    for (let i = 0; i < d; i++) {
      for (let j = 0; j < d; j++) {
        const val = dot(Q[i], Q[j]);
        if (i === j) {
          expect(val).toBeCloseTo(1, 6);
        } else {
          expect(val).toBeCloseTo(0, 6);
        }
      }
    }
  });

  it('preserves vector norms', () => {
    const d = 16;
    const Q = randomOrthogonal(d, seededRng(42));
    const v = Array.from({ length: d }, (_, i) => i + 1);
    const origNorm = norm(v);
    const rotated = matmul(Q, v);
    expect(norm(rotated)).toBeCloseTo(origNorm, 6);
  });

  it('different seeds produce different matrices', () => {
    const Q1 = randomOrthogonal(4, seededRng(1));
    const Q2 = randomOrthogonal(4, seededRng(2));
    const same = Q1.every((row, i) => row.every((v, j) => v === Q2[i][j]));
    expect(same).toBe(false);
  });

  it('same seed produces same matrix', () => {
    const Q1 = randomOrthogonal(4, seededRng(42));
    const Q2 = randomOrthogonal(4, seededRng(42));
    Q1.forEach((row, i) => row.forEach((v, j) => {
      expect(v).toBe(Q2[i][j]);
    }));
  });
});

describe('rotation2D', () => {
  it('rotates by 90 degrees', () => {
    const R = rotation2D(Math.PI / 2);
    const result = matmul(R, [1, 0]);
    expect(result[0]).toBeCloseTo(0);
    expect(result[1]).toBeCloseTo(1);
  });

  it('full rotation returns to original', () => {
    const R = rotation2D(2 * Math.PI);
    const result = matmul(R, [3, 4]);
    expect(result[0]).toBeCloseTo(3);
    expect(result[1]).toBeCloseTo(4);
  });
});

describe('linspace', () => {
  it('generates evenly spaced points', () => {
    const xs = linspace(0, 1, 5);
    expect(xs).toEqual([0, 0.25, 0.5, 0.75, 1]);
  });

  it('handles single point', () => {
    expect(linspace(3, 7, 1)).toEqual([3]);
  });
});

describe('clamp', () => {
  it('clamps below', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });

  it('clamps above', () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it('passes through values in range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });
});

describe('seededRng', () => {
  it('produces deterministic output', () => {
    const rng1 = seededRng(42);
    const rng2 = seededRng(42);
    const vals1 = Array.from({ length: 10 }, () => rng1());
    const vals2 = Array.from({ length: 10 }, () => rng2());
    expect(vals1).toEqual(vals2);
  });

  it('produces values in [0, 1)', () => {
    const rng = seededRng(123);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('different seeds produce different sequences', () => {
    const rng1 = seededRng(1);
    const rng2 = seededRng(2);
    const v1 = rng1();
    const v2 = rng2();
    expect(v1).not.toBe(v2);
  });
});
