export function dot(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

export function norm(v: number[]): number {
  return Math.sqrt(dot(v, v));
}

export function normalize(v: number[]): number[] {
  const n = norm(v);
  if (n === 0) return v.map(() => 0);
  return v.map((x) => x / n);
}

export function scale(v: number[], s: number): number[] {
  return v.map((x) => x * s);
}

export function add(a: number[], b: number[]): number[] {
  return a.map((x, i) => x + b[i]);
}

export function sub(a: number[], b: number[]): number[] {
  return a.map((x, i) => x - b[i]);
}

export function matmul(M: number[][], v: number[]): number[] {
  return M.map((row) => dot(row, v));
}

export function transpose(M: number[][]): number[][] {
  const rows = M.length;
  const cols = M[0].length;
  const T: number[][] = Array.from({ length: cols }, () => new Array(rows));
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      T[j][i] = M[i][j];
    }
  }
  return T;
}

/** Generate a random orthogonal matrix via Gram-Schmidt on a random Gaussian matrix. */
export function randomOrthogonal(d: number, rng: () => number = Math.random): number[][] {
  // Generate random Gaussian matrix
  const M: number[][] = Array.from({ length: d }, () =>
    Array.from({ length: d }, () => {
      // Box-Muller transform
      const u1 = rng();
      const u2 = rng();
      return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    })
  );

  // Gram-Schmidt orthogonalization
  const Q: number[][] = [];
  for (let i = 0; i < d; i++) {
    let v = [...M[i]];
    for (const q of Q) {
      const proj = dot(v, q);
      v = v.map((x, j) => x - proj * q[j]);
    }
    Q.push(normalize(v));
  }
  return Q;
}

/** Random 2D rotation matrix for angle θ. */
export function rotation2D(theta: number): number[][] {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  return [
    [c, -s],
    [s, c],
  ];
}

export function linspace(start: number, end: number, n: number): number[] {
  if (n <= 1) return [start];
  const step = (end - start) / (n - 1);
  return Array.from({ length: n }, (_, i) => start + i * step);
}

export function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

/** Seeded PRNG (mulberry32). */
export function seededRng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Generate a random unit vector (uniform on S^{d-1}) via Box-Muller + normalize. */
export function randomUnitVector(d: number, rng: () => number = Math.random): number[] {
  const raw = Array.from({ length: d }, () => {
    const u1 = rng();
    const u2 = rng();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  });
  return normalize(raw);
}

/** Generate a d×d matrix with i.i.d. N(0,1) entries via Box-Muller. */
export function randomGaussianMatrix(d: number, rng: () => number = Math.random): number[][] {
  return Array.from({ length: d }, () =>
    Array.from({ length: d }, () => {
      const u1 = rng();
      const u2 = rng();
      return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    })
  );
}
