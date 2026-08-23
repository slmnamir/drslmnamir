import { Button } from "@/components/ui/button";
import { getQuestionMap } from "@/lib/exam/bank";
import { useExamStore } from "@/lib/exam/store";
import { formatDuration } from "@/lib/exam/scoring";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function AnalyticsView() {
  const result = useExamStore((s) => s.result);
  const sequence = useExamStore((s) => s.sequence);
  const answers = useExamStore((s) => s.answers);
  const flagged = useExamStore((s) => s.flagged);
  const setPhase = useExamStore((s) => s.setPhase);
  const setReviewIndex = useExamStore((s) => s.setReviewIndex);

  if (!result) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg">
        <Button onClick={() => setPhase("landing")}>Return home</Button>
      </div>
    );
  }

  const byId = getQuestionMap();
  const subData = result.subdomainStats.slice(0, 12).map((s) => ({
    name: s.subdomain.length > 16 ? `${s.subdomain.slice(0, 16)}…` : s.subdomain,
    pct: s.percentage,
    full: `${s.domain} · ${s.subdomain} (${s.correct}/${s.total})`,
  }));

  return (
    <div className="min-h-dvh bg-bg text-ink">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <h1 className="font-serif text-2xl font-medium tracking-tight">Performance analytics</h1>
          <Button variant="secondary" onClick={() => setPhase("results")}>
            Back to results
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-5 py-8">
        <section className="rounded-xl border border-line bg-surface p-6">
          <h2 className="font-serif text-xl font-medium">Weakest subdomains</h2>
          <div className="mt-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={subData}
                layout="vertical"
                margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
              >
                <CartesianGrid stroke="var(--color-line)" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--color-ink-muted)" }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={120}
                  tick={{ fontSize: 11, fill: "var(--color-ink-muted)" }}
                />
                <Tooltip
                  formatter={(v, _n, item) => [`${v}%`, (item.payload as { full: string }).full]}
                  contentStyle={{
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-line)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="pct" fill="var(--color-accent)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-xl border border-line bg-surface p-6">
          <h2 className="font-serif text-xl font-medium">Priority revision topics</h2>
          <ol className="mt-4 space-y-2 text-sm text-ink-muted">
            {result.subdomainStats
              .filter((s) => s.total >= 2)
              .slice(0, 8)
              .map((s, i) => (
                <li key={`${s.domain}-${s.subdomain}`}>
                  {i + 1}. {s.subdomain} ({s.domain}) — {s.percentage}%
                </li>
              ))}
          </ol>
        </section>

        <section className="rounded-xl border border-line bg-surface p-6">
          <h2 className="font-serif text-xl font-medium">Flagged and unanswered</h2>
          <ul className="mt-4 divide-y divide-line text-sm">
            {sequence.map((item, i) => {
              const q = byId.get(item.questionId);
              const ans = answers[item.questionId];
              const isFlag = flagged.includes(item.questionId);
              const unanswered = ans === undefined;
              if (!q || (!isFlag && !unanswered)) return null;
              const ok = ans === q.correctAnswer;
              return (
                <li key={item.questionId} className="flex items-center justify-between gap-3 py-2.5">
                  <button
                    type="button"
                    className="text-left hover:text-accent"
                    onClick={() => setReviewIndex(i)}
                  >
                    Q{i + 1} · {q.subdomain}
                    <span className="ml-2 text-ink-subtle">
                      {unanswered ? "Unanswered" : ok ? "Correct" : "Incorrect"}
                      {isFlag ? " · Flagged" : ""}
                    </span>
                  </button>
                  <span className="tabular-nums text-ink-subtle">
                    {formatDuration(result.timePerQuestionMs[item.questionId] ?? 0)}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      </main>
    </div>
  );
}
