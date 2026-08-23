import {
  BLUEPRINT,
  EXAM_LENGTH,
  type Domain,
  type Question,
} from "./types";
import { estimateAbility, fisherInfo, type IrtItem } from "./irt";

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function shuffle<T>(items: T[], rng: () => number): T[] {
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function abilityFromAnswers(
  sequence: string[],
  answers: Record<string, string>,
  byId: Map<string, Question>,
): { theta: number; se: number } {
  const items: IrtItem[] = [];
  for (const id of sequence) {
    const q = byId.get(id);
    const ans = answers[id];
    if (!q || ans === undefined) continue;
    items.push({
      a: q.discrimination,
      b: q.estimatedDifficulty,
      c: q.guessing,
      u: ans === q.correctAnswer ? 1 : 0,
    });
  }
  return estimateAbility(items);
}

export function selectNextQuestion(
  bank: Question[],
  usedIds: Set<string>,
  theta: number,
  domainCounts: Record<string, number>,
  administered: number,
  rng: () => number,
): Question | null {
  const unused = bank.filter((q) => !usedIds.has(q.id));
  if (unused.length === 0) return null;

  const remaining = EXAM_LENGTH - administered;
  const forced = forcedDomain(domainCounts, remaining);
  const pool = forced
    ? unused.filter((q) => q.domain === forced)
    : unused;
  const candidates = pool.length > 0 ? pool : unused;

  const scored = candidates.map((q) => {
    const info = fisherInfo(
      theta,
      q.discrimination,
      q.estimatedDifficulty,
      q.guessing,
    );
    const given = administered === 0 ? 0 : (domainCounts[q.domain] ?? 0) / administered;
    const target = BLUEPRINT[q.domain];
    const over = Math.max(0, given - target);
    const distance = Math.abs(q.estimatedDifficulty - theta);
    const proximity = Math.exp(-0.85 * distance);
    const score = info * (0.35 + 0.65 * proximity) - 3.2 * over;
    return { q, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const topN = Math.min(administered === 0 ? 8 : 5, scored.length);
  const pick = Math.min(topN - 1, Math.floor(rng() * topN));
  return scored[pick].q;
}

function forcedDomain(
  domainCounts: Record<string, number>,
  remaining: number,
): Domain | null {
  if (remaining <= 0) return null;
  let worst: Domain | null = null;
  let worstDeficit = 0;
  for (const [domain, target] of Object.entries(BLUEPRINT) as [Domain, number][]) {
    const have = domainCounts[domain] ?? 0;
    const need = target * EXAM_LENGTH;
    const deficit = need - have;
    if (deficit > worstDeficit) {
      worstDeficit = deficit;
      worst = domain;
    }
  }
  if (worst && worstDeficit >= remaining * 0.55) return worst;
  return null;
}
