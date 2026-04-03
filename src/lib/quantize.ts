import type { Codebook } from '../types';
import { betaCoordPdf } from './distributions';
import { linspace } from './math';

/**
 * Compute a Lloyd-Max codebook for the Beta coordinate distribution at dimension d.
 * This actually runs the iterative algorithm against the real PDF.
 */
function lloydMax(bits: number, d: number, iterations = 200, resolution = 2000): Codebook {
  const nCentroids = Math.pow(2, bits);
  const support: [number, number] = [-1, 1];

  // Sample the PDF at high resolution
  const xs = linspace(support[0], support[1], resolution);
  const dx = xs[1] - xs[0];
  const pdf = xs.map((x) => betaCoordPdf(x, d));

  // Initialize centroids uniformly
  let centroids = Array.from({ length: nCentroids }, (_, i) =>
    support[0] + ((i + 0.5) / nCentroids) * (support[1] - support[0])
  );

  for (let iter = 0; iter < iterations; iter++) {
    // Compute boundaries as midpoints between consecutive centroids
    const boundaries: number[] = [];
    for (let i = 0; i < nCentroids - 1; i++) {
      boundaries.push((centroids[i] + centroids[i + 1]) / 2);
    }

    // Update centroids: weighted mean within each Voronoi region
    const newCentroids: number[] = [];
    for (let i = 0; i < nCentroids; i++) {
      const lo = i === 0 ? support[0] : boundaries[i - 1];
      const hi = i === nCentroids - 1 ? support[1] : boundaries[i];

      let weightedSum = 0;
      let totalWeight = 0;
      for (let j = 0; j < xs.length; j++) {
        if (xs[j] >= lo && xs[j] < hi) {
          weightedSum += xs[j] * pdf[j] * dx;
          totalWeight += pdf[j] * dx;
        }
      }
      newCentroids.push(totalWeight > 0 ? weightedSum / totalWeight : (lo + hi) / 2);
    }
    centroids = newCentroids;
  }

  // Final boundaries
  const boundaries: number[] = [];
  for (let i = 0; i < nCentroids - 1; i++) {
    boundaries.push((centroids[i] + centroids[i + 1]) / 2);
  }

  return { centroids, boundaries };
}

// Compute codebooks at module load for the Beta distribution at d=128
// This is a one-time cost — the actual Lloyd-Max iterations run here.
const D_DEFAULT = 128;
const CODEBOOKS: Record<number, Codebook> = {};
for (let b = 1; b <= 4; b++) {
  CODEBOOKS[b] = lloydMax(b, D_DEFAULT);
}

/** Get the computed Lloyd-Max codebook for a given bit-width. */
export function getCodebook(bits: number, d: number = D_DEFAULT): Codebook {
  if (d === D_DEFAULT && CODEBOOKS[bits]) return CODEBOOKS[bits];
  // Compute on demand for other dimensions or bit-widths
  return lloydMax(bits, d);
}

/** Quantize a single scalar value to the nearest centroid. Returns the index. */
export function scalarQuantize(value: number, codebook: Codebook): number {
  let bestIdx = 0;
  let bestDist = Infinity;
  for (let i = 0; i < codebook.centroids.length; i++) {
    const dist = Math.abs(value - codebook.centroids[i]);
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = i;
    }
  }
  return bestIdx;
}

/** Dequantize: map index back to centroid value. */
export function scalarDequantize(index: number, codebook: Codebook): number {
  return codebook.centroids[index];
}

/**
 * Compute the inner product attenuation factor for a given bit-width.
 * This is E[c(z)·z] / E[z²] where z ~ BetaCoord(d) and c(z) is the nearest centroid.
 * At 1 bit this equals 2/π ≈ 0.636. At higher bits it approaches 1.0.
 * Precomputed at module load for bits 1–4.
 */
export function getAttenuationFactor(bits: number): number {
  return ATTENUATION[bits] ?? computeAttenuation(bits, D_DEFAULT);
}

function computeAttenuation(bits: number, d: number): number {
  const cb = getCodebook(bits, d);
  const xs = linspace(-1, 1, 4000);
  const dx = xs[1] - xs[0];
  let num = 0;
  let den = 0;
  for (const z of xs) {
    const p = betaCoordPdf(z, d);
    const idx = scalarQuantize(z, cb);
    const cz = scalarDequantize(idx, cb);
    num += cz * z * p * dx;
    den += z * z * p * dx;
  }
  return num / den;
}

const ATTENUATION: Record<number, number> = {};
for (let b = 1; b <= 4; b++) {
  ATTENUATION[b] = computeAttenuation(b, D_DEFAULT);
}

/** QJL: 1-bit quantization via sign(S · r). */
export function qjlQuantize(residual: number[], S: number[][]): number[] {
  return S.map((row) => {
    let sum = 0;
    for (let i = 0; i < residual.length; i++) sum += row[i] * residual[i];
    return sum >= 0 ? 1 : -1;
  });
}

/** QJL dequantize: √(π/2) / d · γ · Sᵀ · z */
export function qjlDequantize(
  signs: number[],
  S: number[][],
  gamma: number,
  d: number
): number[] {
  const sc = (Math.sqrt(Math.PI / 2) / d) * gamma;
  const result = new Array(d).fill(0);
  for (let i = 0; i < signs.length; i++) {
    for (let j = 0; j < d; j++) {
      result[j] += S[i][j] * signs[i];
    }
  }
  return result.map((x) => x * sc);
}
