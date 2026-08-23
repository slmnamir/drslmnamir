import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { EXAM_LENGTH } from "@/lib/exam/types";
import { useExamStore } from "@/lib/exam/store";
import { formatDuration, formatMinutes } from "@/lib/exam/scoring";
import { ShieldCheck } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function ResultsView() {
  const result = useExamStore((s) => s.result);
  const attemptId = useExamStore((s) => s.attemptId);
  const flagged = useExamStore((s) => s.flagged);
  const setPhase = useExamStore((s) => s.setPhase);
  const setReviewIndex = useExamStore((s) => s.setReviewIndex);
  const reset = useExamStore((s) => s.reset);

  if (!result) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg">
        <Button onClick={() => setPhase("landing")}>Return home</Button>
      </div>
    );
  }

  const chartData = result.domainStats.map((d) => ({
    name: shortDomain(d.domain),
    full: d.domain,
    pct: d.percentage,
    label: `${d.correct}/${d.total}`,
  }));

  return (
    <div className="min-h-dvh bg-bg text-ink">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-subtle">
              Helix CAT · {attemptId}
            </p>
            <h1 className="font-serif text-2xl font-medium tracking-tight">Results dashboard</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setReviewIndex(0)}>
              Review questions
            </Button>
            <Button variant="secondary" onClick={() => setPhase("analytics")}>
              Analytics
            </Button>
            <Button onClick={reset}>New attempt</Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-5 py-8">
        <section className="rounded-xl border border-line bg-surface p-6 shadow-[var(--shadow-card)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-subtle">
            Overall performance
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-4">
            <ScoreTile label="Correct" value={`${result.correct}/${EXAM_LENGTH}`} />
            <ScoreTile label="Incorrect" value={`${result.incorrect}`} />
            <ScoreTile label="Unanswered" value={`${result.unanswered}`} />
            <ScoreTile label="Percentage" value={`${result.percentage}%`} accent />
          </div>
          <Separator className="my-6" />
          <div>
            <p className="text-sm font-medium text-ink">Estimated ability (θ)</p>
            <p className="mt-1 font-serif text-4xl tabular-nums text-accent">
              {result.theta >= 0 ? "+" : ""}
              {result.theta.toFixed(2)}
            </p>
            <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-ink-muted">
              This is an internal mock-examination estimate and is NOT an official AMC score.
              It is derived from a simplified 3-parameter logistic model and should not be
              interpreted as a scaled score or pass/fail prediction.
            </p>
          </div>
        </section>

        <section className="rounded-xl border border-line bg-surface p-6 shadow-[var(--shadow-card)]">
          <h2 className="font-serif text-xl font-medium">Domain performance</h2>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 8 }}>
                <CartesianGrid stroke="var(--color-line)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "var(--color-ink-muted)", fontSize: 11 }} />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: "var(--color-ink-muted)", fontSize: 11 }}
                  unit="%"
                />
                <Tooltip
                  formatter={(value, _n, item) => [
                    `${value}% (${(item.payload as { label: string }).label})`,
                    (item.payload as { full: string }).full,
                  ]}
                  contentStyle={{
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-line)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
                  {chartData.map((d) => (
                    <Cell
                      key={d.full}
                      fill={d.pct >= 70 ? "var(--color-success)" : d.pct >= 50 ? "var(--color-accent)" : "var(--color-danger)"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[11px] uppercase tracking-[0.12em] text-ink-subtle">
                <tr>
                  <th className="py-2 font-medium">Domain</th>
                  <th className="py-2 font-medium">Correct</th>
                  <th className="py-2 font-medium">Total</th>
                  <th className="py-2 font-medium">Performance</th>
                </tr>
              </thead>
              <tbody>
                {result.domainStats.map((d) => (
                  <tr key={d.domain} className="border-t border-line">
                    <td className="py-2.5">{d.domain}</td>
                    <td className="py-2.5 tabular-nums">{d.correct}</td>
                    <td className="py-2.5 tabular-nums">{d.total}</td>
                    <td className="py-2.5 tabular-nums">{d.percentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-line bg-surface p-6 shadow-[var(--shadow-card)]">
            <h2 className="font-serif text-xl font-medium">Difficulty</h2>
            <ul className="mt-4 space-y-3">
              {result.difficultyStats.map((d) => (
                <li key={d.difficulty}>
                  <div className="flex justify-between text-sm">
                    <span className="capitalize">{d.difficulty}</span>
                    <span className="tabular-nums text-ink-muted">
                      {d.correct}/{d.total} · {d.percentage}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line">
                    <div
                      className="h-full bg-accent"
                      style={{ width: `${d.percentage}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-line bg-surface p-6 shadow-[var(--shadow-card)]">
            <h2 className="font-serif text-xl font-medium">Timing and flags</h2>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <Info label="Average / question" value={formatMinutes(result.averageTimeMs)} />
              <Info label="Fastest" value={formatDuration(result.fastestMs)} />
              <Info label="Slowest" value={formatDuration(result.slowestMs)} />
              <Info
                label="Flagged performance"
                value={
                  result.flaggedTotal
                    ? `${result.flaggedCorrect}/${result.flaggedTotal}`
                    : `${flagged.length} flagged`
                }
              />
            </dl>
          </div>
        </section>

        <section className="rounded-xl border border-line bg-surface p-6 shadow-[var(--shadow-card)]">
          <h2 className="font-serif text-xl font-medium">Performance summary</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {result.strongAreas.length > 0 &&
              result.strongAreas.map((a) => (
                <Badge key={a} variant="success">
                  Strong · {a}
                </Badge>
              ))}
            {result.weakAreas.length > 0 &&
              result.weakAreas.map((a) => (
                <Badge key={a} variant="danger">
                  Weak · {a}
                </Badge>
              ))}
          </div>
          <ul className="mt-4 space-y-2 text-sm leading-relaxed text-ink-muted">
            {result.recommendations.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </section>

        <p className="flex gap-2 text-[12px] leading-relaxed text-ink-subtle">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" />
          This is an educational AMC-style mock examination and is not an official AMC
          examination. The adaptive scoring system is a simulation and should not be
          interpreted as an official AMC scaled score or pass/fail prediction.
        </p>
      </main>
    </div>
  );
}

function ScoreTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.14em] text-ink-subtle">{label}</p>
      <p className={`mt-1 font-serif text-3xl tabular-nums ${accent ? "text-accent" : "text-ink"}`}>
        {value}
      </p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-[0.12em] text-ink-subtle">{label}</dt>
      <dd className="mt-1 font-medium tabular-nums">{value}</dd>
    </div>
  );
}

function shortDomain(d: string): string {
  const map: Record<string, string> = {
    Medicine: "Med",
    Surgery: "Surg",
    Emergency: "EM",
    Paediatrics: "Paeds",
    "Obstetrics & Gynaecology": "O&G",
    Psychiatry: "Psych",
    "General Practice": "GP",
    "Public Health": "PH",
    "Ethics & Professionalism": "Ethics",
  };
  return map[d] ?? d;
}
