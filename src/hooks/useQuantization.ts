import { useMemo, useRef } from 'react';
import { matmul, transpose, sub, norm as vecNorm, randomOrthogonal, randomGaussianMatrix } from '../lib/math';
import { getCodebook, scalarQuantize, scalarDequantize, qjlQuantize, qjlDequantize } from '../lib/quantize';
import type { QuantizationResult } from '../types';

interface UseQuantizationOptions {
  qjl?: boolean;
}

export function useQuantization(
  vector: number[],
  bitWidth: number,
  options: UseQuantizationOptions = {}
): QuantizationResult {
  const { qjl = false } = options;
  const d = vector.length;

  // Generate rotation and projection matrices once per component lifetime
  const matricesRef = useRef<{ R: number[][]; Rt: number[][]; S: number[][] } | null>(null);
  if (!matricesRef.current || matricesRef.current.R.length !== d) {
    const R = randomOrthogonal(d);
    matricesRef.current = {
      R,
      Rt: transpose(R),
      S: randomGaussianMatrix(d),
    };
  }

  return useMemo(() => {
    const { R, Rt, S } = matricesRef.current!;
    const effectiveBits = qjl ? Math.max(1, bitWidth - 1) : bitWidth;
    const codebook = getCodebook(effectiveBits);

    // Rotate
    const rotated = matmul(R, vector);

    // Quantize each coordinate
    const indices = rotated.map((v) => scalarQuantize(v, codebook));
    const dequantized = indices.map((idx) => scalarDequantize(idx, codebook));

    // Rotate back
    let reconstructed = matmul(Rt, dequantized);

    if (qjl && bitWidth > 1) {
      const residual = sub(vector, reconstructed);
      const gamma = vecNorm(residual);
      const signs = qjlQuantize(residual, S);
      const qjlRecon = qjlDequantize(signs, S, gamma, d);
      reconstructed = reconstructed.map((v, i) => v + qjlRecon[i]);
    }

    const diff = sub(vector, reconstructed);
    const mse = diff.reduce((s, x) => s + x * x, 0) / d;

    return { original: vector, rotated, indices, dequantized, reconstructed, mse, codebook };
  }, [vector, bitWidth, qjl, d]);
}
