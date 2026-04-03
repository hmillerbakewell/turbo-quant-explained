import { describe, it, expect } from 'vitest';
import {
  computeSigns,
  reconstruct,
  norm2D,
  angleDeg,
  directionError,
  qjl2D,
  randomVec2D,
  randomProjections,
  type Vec2D,
} from './qjl2d';
import { seededRng } from './math';

// ---- computeSigns: hand-worked examples ----

describe('computeSigns', () => {
  // [1,0] · [1,0] = 1 >= 0 → +1
  it('[1,0] projected onto [1,0] → +1', () => {
    expect(computeSigns([1, 0], [[1, 0]])).toEqual([1]);
  });

  // [-1,0] · [1,0] = -1 < 0 → -1
  it('[-1,0] projected onto [1,0] → -1', () => {
    expect(computeSigns([-1, 0], [[1, 0]])).toEqual([-1]);
  });

  // [1,1] · [1,0] = 1, [1,1] · [0,1] = 1, [1,1] · [-1,0] = -1
  it('[1,1] against three directions', () => {
    expect(computeSigns([1, 1], [[1, 0], [0, 1], [-1, 0]])).toEqual([1, 1, -1]);
  });

  // [0.5,0] · [0,1] = 0 >= 0 → +1
  it('perpendicular: dot=0 gives +1', () => {
    expect(computeSigns([0.5, 0], [[0, 1]])).toEqual([1]);
  });

  // [0,0] · anything = 0 >= 0 → +1
  it('zero vector: all signs are +1', () => {
    expect(computeSigns([0, 0], [[1, 0], [0, 1], [-1, -1]])).toEqual([1, 1, 1]);
  });

  // [0.4, 0.3] · [1, 0] = 0.4 → +1
  // [0.4, 0.3] · [-1, 0] = -0.4 → -1
  it('[0.4,0.3] against [1,0] and [-1,0]', () => {
    expect(computeSigns([0.4, 0.3], [[1, 0], [-1, 0]])).toEqual([1, -1]);
  });
});

// ---- reconstruct: hand-worked examples ----
// Formula: signed_avg = Σ sign_i · d_i / n
//          normalize to unit, scale to ‖r‖

describe('reconstruct', () => {
  // r = [0, 0] → [0, 0] regardless of projections/signs
  it('zero vector → [0, 0]', () => {
    const rec = reconstruct([0, 0], [[1, 0], [0, 1]], [1, -1]);
    expect(rec).toEqual([0, 0]);
  });

  // r = [0.5, 0], projections = [[1,0], [0,1]]
  // signs = [+1, +1]
  // signed avg = (+1·[1,0] + +1·[0,1]) / 2 = [0.5, 0.5]
  // ‖[0.5,0.5]‖ = √0.5
  // normalized = [1/√2, 1/√2]
  // scaled to ‖r‖ = 0.5: [0.5/√2, 0.5/√2]
  it('r=[0.5,0], axis-aligned projections', () => {
    const r: Vec2D = [0.5, 0];
    const dirs: Vec2D[] = [[1, 0], [0, 1]];
    const signs = computeSigns(r, dirs);
    const rec = reconstruct(r, dirs, signs);

    const expected = 0.5 / Math.sqrt(2);
    expect(rec[0]).toBeCloseTo(expected, 10);
    expect(rec[1]).toBeCloseTo(expected, 10);
    expect(norm2D(rec)).toBeCloseTo(0.5, 10);
  });

  // r = [0.4, 0.3], projections = [[1,0], [-1,0]]
  // signs = [+1, -1]
  // signed sum = +1·[1,0] + -1·[-1,0] = [1,0] + [1,0] = [2, 0]
  // avg = [1, 0], ‖avg‖ = 1
  // ‖r‖ = 0.5, so rec = [0.5, 0]
  it('r=[0.4,0.3], opposite x projections → along x', () => {
    const r: Vec2D = [0.4, 0.3];
    const dirs: Vec2D[] = [[1, 0], [-1, 0]];
    const signs = computeSigns(r, dirs);
    const rec = reconstruct(r, dirs, signs);

    expect(rec[0]).toBeCloseTo(0.5, 10);
    expect(rec[1]).toBeCloseTo(0, 10);
  });

  // r = [0.3, 0.4], projections = [[0, 1]]
  // signs = [+1]
  // signed avg = [0, 1], ‖avg‖ = 1
  // ‖r‖ = 0.5, so rec = [0, 0.5]
  it('r=[0.3,0.4], single y projection → along y', () => {
    const r: Vec2D = [0.3, 0.4];
    const dirs: Vec2D[] = [[0, 1]];
    const signs = computeSigns(r, dirs);
    const rec = reconstruct(r, dirs, signs);

    expect(rec[0]).toBeCloseTo(0, 10);
    expect(rec[1]).toBeCloseTo(0.5, 10);
  });

  // r = [0.3, 0.4], projections = [[1,0], [0,1], [-1,0], [0,-1]]
  // signs: [1,0]·r=0.3→+1, [0,1]·r=0.4→+1, [-1,0]·r=-0.3→-1, [0,-1]·r=-0.4→-1
  // signed sum = [1,0]+[0,1]+[1,0]+[0,1] = [2, 2]
  // avg = [0.5, 0.5], ‖avg‖ = √0.5
  // ‖r‖ = 0.5, so rec = 0.5 · [1/√2, 1/√2] = [0.5/√2, 0.5/√2]
  it('r=[0.3,0.4], 4 axis-aligned projections', () => {
    const r: Vec2D = [0.3, 0.4];
    const dirs: Vec2D[] = [[1, 0], [0, 1], [-1, 0], [0, -1]];
    const signs = computeSigns(r, dirs);
    expect(signs).toEqual([1, 1, -1, -1]);

    const rec = reconstruct(r, dirs, signs);
    const expected = 0.5 / Math.sqrt(2);
    expect(rec[0]).toBeCloseTo(expected, 10);
    expect(rec[1]).toBeCloseTo(expected, 10);
  });

  // Cancellation: all signs the same → signed avg is mean of directions
  // r = [0.5, 0.5], projections = [[1,0], [0,1]]
  // signs = [+1, +1]
  // Same as axis-aligned case above with ‖r‖ = √0.5
  it('all-positive signs: avg of directions scaled to ‖r‖', () => {
    const r: Vec2D = [0.5, 0.5];
    const dirs: Vec2D[] = [[1, 0], [0, 1]];
    const signs = computeSigns(r, dirs);
    expect(signs).toEqual([1, 1]);

    const rec = reconstruct(r, dirs, signs);
    // avg = [0.5, 0.5], unit = [1/√2, 1/√2], scaled to ‖r‖ = √0.5
    const rNorm = Math.sqrt(0.5);
    expect(rec[0]).toBeCloseTo(rNorm / Math.sqrt(2), 10);
    expect(rec[1]).toBeCloseTo(rNorm / Math.sqrt(2), 10);
    expect(norm2D(rec)).toBeCloseTo(rNorm, 10);
  });
});

// ---- norm2D, angleDeg, directionError ----

describe('norm2D', () => {
  it('[3,4] → 5', () => expect(norm2D([3, 4])).toBe(5));
  it('[0,0] → 0', () => expect(norm2D([0, 0])).toBe(0));
  it('[1,0] → 1', () => expect(norm2D([1, 0])).toBe(1));
});

describe('angleDeg', () => {
  it('[1,0] → 0°', () => expect(angleDeg([1, 0])).toBeCloseTo(0));
  it('[0,1] → 90°', () => expect(angleDeg([0, 1])).toBeCloseTo(90));
  it('[-1,0] → 180°', () => expect(angleDeg([-1, 0])).toBeCloseTo(180));
  it('[0,-1] → -90°', () => expect(angleDeg([0, -1])).toBeCloseTo(-90));
  it('[1,1] → 45°', () => expect(angleDeg([1, 1])).toBeCloseTo(45));
});

describe('directionError', () => {
  it('identical vectors → 0°', () => {
    expect(directionError([0.5, 0.3], [0.5, 0.3])).toBeCloseTo(0);
  });
  it('zero input → 0°', () => {
    expect(directionError([0, 0], [1, 0])).toBe(0);
  });
  it('[1,0] vs [0,1] → 90°', () => {
    expect(directionError([1, 0], [0, 1])).toBeCloseTo(90);
  });
});

// ---- randomVec2D / randomProjections: determinism ----

describe('randomVec2D', () => {
  it('deterministic with same seed', () => {
    expect(randomVec2D(seededRng(42))).toEqual(randomVec2D(seededRng(42)));
  });

  it('within length bounds', () => {
    const v = randomVec2D(seededRng(1), 0.3, 0.7);
    const n = norm2D(v);
    expect(n).toBeGreaterThanOrEqual(0.3 - 1e-10);
    expect(n).toBeLessThanOrEqual(0.7 + 1e-10);
  });
});

describe('randomProjections', () => {
  it('correct count', () => {
    expect(randomProjections(5, seededRng(1)).length).toBe(5);
  });

  it('all unit vectors', () => {
    for (const p of randomProjections(10, seededRng(99))) {
      expect(norm2D(p)).toBeCloseTo(1, 6);
    }
  });

  it('deterministic with same seed', () => {
    expect(randomProjections(3, seededRng(42))).toEqual(randomProjections(3, seededRng(42)));
  });
});

// ---- qjl2D integration ----

describe('qjl2D', () => {
  it('returns correct structure', () => {
    const result = qjl2D([0.4, 0.3], [[1, 0], [0, 1]]);
    expect(result.signs.length).toBe(2);
    expect(result.recon.length).toBe(2);
    expect(typeof result.directionError).toBe('number');
  });

  // Full hand-worked check:
  // r=[0.4,0.3], dirs=[[1,0],[0,1]]
  // signs=[+1,+1], avg=[0.5,0.5], unit=[1/√2,1/√2], ‖r‖=0.5
  // recon=[0.5/√2, 0.5/√2], directionError = |45° - 36.87°| = 8.13°
  it('matches hand-computed result', () => {
    const result = qjl2D([0.4, 0.3], [[1, 0], [0, 1]]);
    expect(result.signs).toEqual([1, 1]);
    const e = 0.5 / Math.sqrt(2);
    expect(result.recon[0]).toBeCloseTo(e, 10);
    expect(result.recon[1]).toBeCloseTo(e, 10);
    // r is at atan2(0.3, 0.4) ≈ 36.87°, recon at 45°
    expect(result.directionError).toBeCloseTo(Math.abs(45 - Math.atan2(0.3, 0.4) * 180 / Math.PI), 5);
  });
});
