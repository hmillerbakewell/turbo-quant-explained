/** Beta PDF for a coordinate of a unit vector on S^{d-1}. */
export function betaCoordPdf(x: number, d: number): number {
  if (Math.abs(x) >= 1) return 0;
  // f_X(x) = Γ(d/2) / (√π · Γ((d-1)/2)) · (1 - x²)^((d-3)/2)
  // We use the log-gamma for numerical stability
  const logCoeff =
    lgamma(d / 2) - 0.5 * Math.log(Math.PI) - lgamma((d - 1) / 2);
  const logBody = ((d - 3) / 2) * Math.log(1 - x * x);
  return Math.exp(logCoeff + logBody);
}

/** Gaussian PDF. */
export function gaussianPdf(x: number, mu: number, sigma: number): number {
  const z = (x - mu) / sigma;
  return Math.exp(-0.5 * z * z) / (sigma * Math.sqrt(2 * Math.PI));
}

/** Bin data into a histogram. */
export function histogram(
  data: number[],
  bins: number,
  range?: [number, number]
): { edges: number[]; counts: number[] } {
  const lo = range ? range[0] : Math.min(...data);
  const hi = range ? range[1] : Math.max(...data);
  const step = (hi - lo) / bins;
  const counts = new Array(bins).fill(0);
  const edges = Array.from({ length: bins + 1 }, (_, i) => lo + i * step);

  for (const v of data) {
    const idx = Math.floor((v - lo) / step);
    counts[Math.min(idx, bins - 1)]++;
  }

  return { edges, counts };
}

/** Sample from the Beta coordinate distribution by sampling uniform on S^{d-1}. */
export function sampleBetaCoord(d: number, n: number, rng: () => number = Math.random): number[] {
  const samples: number[] = [];
  for (let i = 0; i < n; i++) {
    // Generate d Gaussian samples, normalize, take first coordinate
    const v: number[] = [];
    for (let j = 0; j < d; j++) {
      const u1 = rng();
      const u2 = rng();
      v.push(Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2));
    }
    const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
    samples.push(v[0] / norm);
  }
  return samples;
}

/** Lanczos approximation of log-gamma. */
function lgamma(x: number): number {
  const c = [
    76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.001208650973866179, -0.000005395239384953,
  ];
  let y = x;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) {
    ser += c[j] / ++y;
  }
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}
