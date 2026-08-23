import {
  DOMAINS,
  type Difficulty,
  type Domain,
  type DomainStat,
  type DifficultyStat,
  type ExamResult,
  type Question,
  type SubdomainStat,
} from "./types";
import { abilityFromAnswers } from "./cat";

const DIFFICULTIES: Difficulty[] = ["easy", "moderate", "difficult"];

export function scoreAttempt(
  sequence: string[],
  answers: Record<string, string>,
  flagged: string[],
  timeSpentMs: Record<string, number>,
  byId: Map<string, Question>,
): ExamResult {
  let correct = 0;
  let incorrect = 0;
  let unanswered = 0;

  const domainMap = new Map<Domain, { correct: number; total: number }>();
  const diffMap = new Map<Difficulty, { correct: number; total: number }>();
  const subMap = new Map<string, { domain: Domain; subdomain: string; correct: number; total: number }>();

  for (const d of DOMAINS) domainMap.set(d, { correct: 0, total: 0 });
  for (const d of DIFFICULTIES) diffMap.set(d, { correct: 0, total: 0 });

  for (const id of sequence) {
    const q = byId.get(id);
    if (!q) continue;
    const ans = answers[id];
    const isCorrect = ans !== undefined && ans === q.correctAnswer;
    const isUnanswered = ans === undefined;

    if (isUnanswered) unanswered += 1;
    else if (isCorrect) correct += 1;
    else incorrect += 1;

    const ds = domainMap.get(q.domain)!;
    ds.total += 1;
    if (isCorrect) ds.correct += 1;

    const dif = diffMap.get(q.difficulty)!;
    dif.total += 1;
    if (isCorrect) dif.correct += 1;

    const key = `${q.domain}::${q.subdomain}`;
    const sub = subMap.get(key) ?? {
      domain: q.domain,
      subdomain: q.subdomain,
      correct: 0,
      total: 0,
    };
    sub.total += 1;
    if (isCorrect) sub.correct += 1;
    subMap.set(key, sub);
  }

  const domainStats: DomainStat[] = DOMAINS.map((domain) => {
    const s = domainMap.get(domain)!;
    return {
      domain,
      correct: s.correct,
      total: s.total,
      percentage: s.total === 0 ? 0 : Math.round((s.correct / s.total) * 100),
    };
  }).filter((s) => s.total > 0);

  const difficultyStats: DifficultyStat[] = DIFFICULTIES.map((difficulty) => {
    const s = diffMap.get(difficulty)!;
    return {
      difficulty,
      correct: s.correct,
      total: s.total,
      percentage: s.total === 0 ? 0 : Math.round((s.correct / s.total) * 100),
    };
  }).filter((s) => s.total > 0);

  const subdomainStats: SubdomainStat[] = [...subMap.values()]
    .map((s) => ({
      ...s,
      percentage: s.total === 0 ? 0 : Math.round((s.correct / s.total) * 100),
    }))
    .sort((a, b) => a.percentage - b.percentage);

  const times = sequence.map((id) => timeSpentMs[id] ?? 0).filter((t) => t > 0);
  const averageTimeMs =
    times.length === 0 ? 0 : Math.round(times.reduce((a, b) => a + b, 0) / times.length);
  const fastestMs = times.length === 0 ? 0 : Math.min(...times);
  const slowestMs = times.length === 0 ? 0 : Math.max(...times);

  let flaggedCorrect = 0;
  let flaggedTotal = 0;
  for (const id of flagged) {
    if (!sequence.includes(id)) continue;
    flaggedTotal += 1;
    if (answers[id] === byId.get(id)?.correctAnswer) flaggedCorrect += 1;
  }

  const rankedDomains = [...domainStats].sort((a, b) => b.percentage - a.percentage);
  const strongAreas = rankedDomains.filter((d) => d.total >= 3 && d.percentage >= 70).map((d) => d.domain);
  const weakAreas = rankedDomains
    .filter((d) => d.total >= 3 && d.percentage < 60)
    .sort((a, b) => a.percentage - b.percentage)
    .map((d) => d.domain);

  const weakSubs = subdomainStats.filter((s) => s.total >= 2 && s.percentage < 60).slice(0, 6);
  const recommendations = buildRecommendations(rankedDomains, weakSubs, correct, sequence.length);

  const { theta } = abilityFromAnswers(sequence, answers, byId);
  const total = sequence.length;
  const percentage = total === 0 ? 0 : Math.round((correct / total) * 100);

  return {
    correct,
    incorrect,
    unanswered,
    percentage,
    theta,
    domainStats,
    difficultyStats,
    subdomainStats,
    timePerQuestionMs: { ...timeSpentMs },
    averageTimeMs,
    fastestMs,
    slowestMs,
    flaggedCorrect,
    flaggedTotal,
    strongAreas,
    weakAreas,
    recommendations,
    submittedAt: Date.now(),
  };
}

function buildRecommendations(
  domains: DomainStat[],
  weakSubs: SubdomainStat[],
  correct: number,
  total: number,
): string[] {
  const out: string[] = [];
  const pct = total === 0 ? 0 : Math.round((correct / total) * 100);
  const strongest = domains[0];
  const weakest = [...domains].sort((a, b) => a.percentage - b.percentage)[0];

  if (strongest && weakest && strongest.domain !== weakest.domain) {
    out.push(
      `Your strongest domain was ${strongest.domain} (${strongest.percentage}%). Your weakest domain was ${weakest.domain} (${weakest.percentage}%).`,
    );
  }

  if (weakSubs.length > 0) {
    const topics = weakSubs.map((s) => s.subdomain).join(", ");
    out.push(`Prioritise revision in: ${topics}.`);
  }

  if (pct >= 75) {
    out.push(
      "Overall performance is strong. Focus remaining study on the weaker subdomains above and on difficult integrative items (competing diagnoses, contraindications, and sequencing of care).",
    );
  } else if (pct >= 55) {
    out.push(
      "Solid foundation with gaps that will cost marks. Drill the weak domains with vignette-based questions, then review why each distractor is wrong.",
    );
  } else {
    out.push(
      "Rebuild core frameworks first: ABCs and emergency algorithms, common presentations, first-line investigations, and Australian first-line therapies. Then re-attempt a timed block.",
    );
  }

  return out;
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatMinutes(ms: number): string {
  const m = Math.max(0, Math.round(ms / 60000));
  if (m < 1) return "<1 min";
  return `${m} min`;
}
