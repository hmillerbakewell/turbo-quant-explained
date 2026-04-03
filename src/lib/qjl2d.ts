/**
 * 2D QJL demonstration.
 *
 * Shows the core idea: random lines through the origin divide the plane.
 * For each line, we record which side a vector falls on (+1 or −1).
 * From just those sign bits, we can approximately reconstruct the vector.
 */

export type Vec2D = [number, number];

/** Generate a random 2D vector with given length bounds. */
export function randomVec2D(rng: () => number, minLen = 0.3, maxLen = 0.7): Vec2D {
  const angle = rng() * 2 * Math.PI;
  const len = minLen + rng() * (maxLen - minLen);
  return [Math.cos(angle) * len, Math.sin(angle) * len];
}

/** Generate n random unit directions (lines through the origin). */
export function randomProjections(n: number, rng: () => number): Vec2D[] {
  return Array.from({ length: n }, () => {
    const a = rng() * 2 * Math.PI;
    return [Math.cos(a), Math.sin(a)] as Vec2D;
  });
}

/** For each projection direction, which side does r fall on? */
export function computeSigns(r: Vec2D, projections: Vec2D[]): number[] {
  return projections.map(([dx, dy]) => (r[0] * dx + r[1] * dy >= 0 ? 1 : -1));
}

/**
 * Reconstruct r from signs and projection directions.
 * Take the signed average of projection directions, then scale to match ‖r‖.
 */
export function reconstruct(r: Vec2D, projections: Vec2D[], signs: number[]): Vec2D {
  const rNorm = norm2D(r);
  if (rNorm === 0) return [0, 0];

  // Signed average of directions
  let sx = 0, sy = 0;
  for (let i = 0; i < projections.length; i++) {
    sx += signs[i] * projections[i][0];
    sy += signs[i] * projections[i][1];
  }
  sx /= projections.length;
  sy /= projections.length;

  // Scale to match the original vector's length
  const avgNorm = Math.sqrt(sx * sx + sy * sy);
  if (avgNorm === 0) return [0, 0];
  return [sx / avgNorm * rNorm, sy / avgNorm * rNorm];
}

export function norm2D(v: Vec2D): number {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1]);
}

export function angleDeg(v: Vec2D): number {
  return Math.atan2(v[1], v[0]) * (180 / Math.PI);
}

/** Direction error between r and its reconstruction, in degrees. */
export function directionError(r: Vec2D, recon: Vec2D): number {
  if (norm2D(r) === 0 || norm2D(recon) === 0) return 0;
  return Math.abs(angleDeg(recon) - angleDeg(r));
}

/** Full QJL encode-decode: compute signs, reconstruct, measure error. */
export function qjl2D(r: Vec2D, projections: Vec2D[]) {
  const signs = computeSigns(r, projections);
  const recon = reconstruct(r, projections, signs);
  return { signs, recon, directionError: directionError(r, recon) };
}
