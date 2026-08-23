/** 3-parameter logistic IRT helpers and EAP ability estimation. */

export interface IrtItem {
  a: number;
  b: number;
  c: number;
  u: 0 | 1;
}

const NODES = 41;
const THETA_MIN = -4;
const THETA_MAX = 4;
const GRID: number[] = Array.from(
  { length: NODES },
  (_, i) => THETA_MIN + (i * (THETA_MAX - THETA_MIN)) / (NODES - 1),
);

function normalPdf(x: number, mean = 0, sd = 1): number {
  const z = (x - mean) / sd;
  return Math.exp(-0.5 * z * z) / (sd * Math.sqrt(2 * Math.PI));
}

/** P(correct | θ) under the 3PL model. */
export function pl3(theta: number, a: number, b: number, c: number): number {
  const expo = Math.exp(-a * (theta - b));
  return c + (1 - c) / (1 + expo);
}

/** Fisher information of a 3PL item at θ. */
export function fisherInfo(theta: number, a: number, b: number, c: number): number {
  const p = pl3(theta, a, b, c);
  if (p <= 0 || p >= 1) return 0;
  const q = 1 - p;
  const num = a * a * ((p - c) / (1 - c)) ** 2 * q;
  return num / p;
}

function likelihood(theta: number, items: IrtItem[]): number {
  let like = 1;
  for (const item of items) {
    const p = pl3(theta, item.a, item.b, item.c);
    const clamped = Math.min(0.999, Math.max(0.001, p));
    like *= item.u === 1 ? clamped : 1 - clamped;
  }
  return like;
}

/** Expected a posteriori ability with N(0,1) prior. */
export function estimateAbility(items: IrtItem[]): { theta: number; se: number } {
  if (items.length === 0) return { theta: 0, se: 1 };

  let num = 0;
  let den = 0;
  const weights: number[] = [];

  for (const th of GRID) {
    const w = normalPdf(th) * likelihood(th, items);
    weights.push(w);
    num += th * w;
    den += w;
  }

  if (den <= 0) return { theta: 0, se: 1 };

  const theta = num / den;
  let varSum = 0;
  for (let i = 0; i < GRID.length; i++) {
    const d = GRID[i] - theta;
    varSum += d * d * weights[i];
  }
  const se = Math.sqrt(Math.max(varSum / den, 0.04));
  return {
    theta: Math.max(THETA_MIN, Math.min(THETA_MAX, theta)),
    se,
  };
}
