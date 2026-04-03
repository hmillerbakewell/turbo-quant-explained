import { describe, it, expect } from 'vitest';
import { qjlQuantize, qjlDequantize, getCodebook, scalarQuantize, scalarDequantize } from './quantize';
import { dot, norm, randomOrthogonal, randomUnitVector, randomGaussianMatrix, matmul, transpose, sub, seededRng } from './math';

describe('QJL unbiasedness (isolated)', () => {
  // Test that QJL alone produces an unbiased inner product estimator.
  // For a fixed r and y, E_S[⟨y, dequant(sign(S·r))⟩] = ⟨y, r⟩
  it('QJL inner product estimate is unbiased over many random S matrices', () => {
    const d = 16;
    const rng = seededRng(42);
    const r = randomUnitVector(d, rng);
    const y = randomUnitVector(d, rng);
    const trueIP = dot(y, r);
    const gamma = norm(r);

    const nTrials = 500;
    let estimateSum = 0;

    for (let t = 0; t < nTrials; t++) {
      const S = randomGaussianMatrix(d, rng);
      const signs = qjlQuantize(r, S);
      const recon = qjlDequantize(signs, S, gamma, d);
      estimateSum += dot(y, recon);
    }

    const meanEstimate = estimateSum / nTrials;
    // Should be close to trueIP
    expect(meanEstimate).toBeCloseTo(trueIP, 1);
  });
});

describe('QJL unbiasedness (with MSE quantization)', () => {
  // Test the full two-stage pipeline: MSE quantize with b-1 bits,
  // then QJL on the residual. The combined inner product should be unbiased.
  it('MSE + QJL inner product is unbiased', () => {
    const d = 32;
    const bits = 2; // 1 bit MSE + 1 bit QJL
    const rng = seededRng(99);

    const x = randomUnitVector(d, rng);
    const y = randomUnitVector(d, rng);
    const trueIP = dot(y, x);

    const R = randomOrthogonal(d, rng);
    const Rt = transpose(R);
    const cb = getCodebook(bits - 1); // 1 bit for MSE

    // MSE quantize
    const rotated = matmul(R, x);
    const indices = rotated.map((v) => scalarQuantize(v, cb));
    const deq = indices.map((idx) => scalarDequantize(idx, cb));
    const xMse = matmul(Rt, deq);
    const residual = sub(x, xMse);
    const gamma = norm(residual);

    const nTrials = 500;
    let estimateSum = 0;

    for (let t = 0; t < nTrials; t++) {
      const S = randomGaussianMatrix(d, rng);
      const signs = qjlQuantize(residual, S);
      const qjlRecon = qjlDequantize(signs, S, gamma, d);
      const xFull = xMse.map((v, i) => v + qjlRecon[i]);
      estimateSum += dot(y, xFull);
    }

    const meanEstimate = estimateSum / nTrials;
    expect(meanEstimate).toBeCloseTo(trueIP, 1);
  });

  // Removed: stochastic bias test. See deterministic tests in mse-bias.test.ts.
});
