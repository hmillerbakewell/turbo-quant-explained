import { describe, it, expect } from 'vitest';
import { getCodebook, scalarQuantize, scalarDequantize } from './quantize';
import { betaCoordPdf } from './distributions';
import { linspace } from './math';

const D = 128;
const RESOLUTION = 4000;

/**
 * Compute the attenuation factor for a given bit-width by numerical integration.
 *
 * The MSE-optimal quantizer maps each coordinate z → c(z) (nearest centroid).
 * After rotation, coordinates are distributed according to the Beta coordinate PDF.
 *
 * The inner product ratio is:
 *   E[c(z) · z] / E[z²]
 *
 * where z ~ BetaCoord(d). If this equals 1, the quantizer is unbiased for inner
 * products. If < 1, inner products are shrunk toward zero (multiplicative bias).
 *
 * Per TurboQuant Section 3.2, at 1 bit this should be 2/π ≈ 0.6366.
 */
function attenuationFactor(bits: number, d: number): number {
  const cb = getCodebook(bits, d);
  const xs = linspace(-1, 1, RESOLUTION);
  const dx = xs[1] - xs[0];

  let numerator = 0; // E[c(z) · z]
  let denominator = 0; // E[z²]

  for (const z of xs) {
    const p = betaCoordPdf(z, d);
    const idx = scalarQuantize(z, cb);
    const cz = scalarDequantize(idx, cb);

    numerator += cz * z * p * dx;
    denominator += z * z * p * dx;
  }

  return numerator / denominator;
}

describe('MSE quantization multiplicative bias (deterministic)', () => {
  it('1-bit centroids match theoretical ±√(2/(πd))', () => {
    const cb = getCodebook(1, D);
    const theoretical = Math.sqrt(2 / (Math.PI * D));
    // Centroids should be symmetric: [-c, +c]
    expect(cb.centroids[0]).toBeCloseTo(-theoretical, 3);
    expect(cb.centroids[1]).toBeCloseTo(theoretical, 3);
  });

  it('1-bit attenuation factor ≈ 2/π', () => {
    const factor = attenuationFactor(1, D);
    expect(factor).toBeCloseTo(2 / Math.PI, 2);
  });

  it('attenuation factor increases toward 1 with more bits', () => {
    const factors = [1, 2, 3, 4].map((b) => attenuationFactor(b, D));

    // Each should be strictly increasing
    for (let i = 1; i < factors.length; i++) {
      expect(factors[i]).toBeGreaterThan(factors[i - 1]);
    }

    // All should be < 1 (always some attenuation)
    for (const f of factors) {
      expect(f).toBeLessThan(1);
    }

    // At 4 bits, should be close to 1
    expect(factors[3]).toBeGreaterThan(0.99);
  });
});
