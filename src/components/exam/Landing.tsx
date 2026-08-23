import { useState } from "react";
import {
  BookOpen,
  Clock3,
  Flag,
  GitBranch,
  LayoutList,
  LineChart,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EXAM_LENGTH } from "@/lib/exam/types";
import { useExamStore } from "@/lib/exam/store";
import { getQuestionBank } from "@/lib/exam/bank";

const FEATURES = [
  { icon: LayoutList, label: "150 questions" },
  { icon: GitBranch, label: "Adaptive difficulty" },
  { icon: BookOpen, label: "Single-best-answer" },
  { icon: Clock3, label: "3 hours 30 minutes" },
  { icon: Flag, label: "Flag for review" },
  { icon: LineChart, label: "Post-exam analytics" },
];

const INSTRUCTIONS = [
  "Select the single best answer. Some items have four options; others have five.",
  "Question difficulty adapts to your responses. You will not see an ability estimate during the examination.",
  "You may return to previously encountered questions, change answers, and flag items for review.",
  "The countdown continues while you navigate and while you review. There is no pause.",
  "Unanswered items score as incorrect on the raw mark. The ability estimate uses answered items only.",
  "Explanations, domain analysis, and the ability estimate are available only after final submission.",
  "Once submitted, this attempt cannot be resumed. You may start a new attempt from the results screen.",
];

export function Landing() {
  const [ready, setReady] = useState(false);
  const startExam = useExamStore((s) => s.startExam);
  const attemptId = useExamStore((s) => s.attemptId);
  const phase = useExamStore((s) => s.phase);
  const sequence = useExamStore((s) => s.sequence);
  const returnToExam = useExamStore((s) => s.returnToExam);
  const setPhase = useExamStore((s) => s.setPhase);
  const reset = useExamStore((s) => s.reset);
  const bankSize = getQuestionBank().length;

  const canResume =
    Boolean(attemptId) &&
    sequence.length > 0 &&
    (phase === "exam" || phase === "review" || phase === "confirm");
  const canViewResults = Boolean(attemptId) && phase === "results";

  return (
    <div className="min-h-dvh bg-bg text-ink">
      <header className="border-b border-line bg-surface/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex size-8 items-center justify-center rounded-sm bg-accent font-serif text-sm font-semibold text-accent-fg">
              H
            </span>
            <div>
              <p className="text-sm font-semibold tracking-wide">Helix CAT</p>
              <p className="text-[11px] uppercase tracking-[0.16em] text-ink-subtle">
                Educational mock
              </p>
            </div>
          </div>
          <p className="hidden text-xs text-ink-subtle sm:block">
            {bankSize.toLocaleString()} calibrated items
          </p>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-10 px-5 py-10 lg:grid-cols-[1.15fr_0.85fr] lg:py-16">
        <section>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">
            Full-length simulation
          </p>
          <h1 className="mt-3 font-serif text-[2.15rem] font-medium leading-[1.15] tracking-tight text-ink sm:text-5xl">
            AMC 1 — CAT-Style Mock Examination
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-ink-muted">
            A 150-question computer-adaptive mock built for serious AMC CAT MCQ
            preparation. Clinical vignettes, IRT-inspired item selection, and a
            timed interface modelled on a professional licensing centre.
          </p>

          <ul className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {FEATURES.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="flex items-center gap-2 rounded-md border border-line bg-surface px-3 py-2.5 text-[13px] text-ink"
              >
                <Icon className="size-3.5 text-accent" strokeWidth={1.75} />
                {label}
              </li>
            ))}
          </ul>

          {canResume && (
            <div className="mt-8 rounded-lg border border-accent/20 bg-accent-soft px-4 py-4">
              <p className="text-sm font-medium text-ink">Attempt in progress</p>
              <p className="mt-1 text-sm text-ink-muted">
                Question {sequence.length} of {EXAM_LENGTH} has been unlocked.
                Your answers, flags, and remaining time were saved.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button onClick={() => returnToExam()}>Resume examination</Button>
                <Button variant="secondary" onClick={() => reset()}>
                  Discard and start new
                </Button>
              </div>
            </div>
          )}

          {canViewResults && (
            <div className="mt-8 rounded-lg border border-line bg-surface px-4 py-4">
              <p className="text-sm font-medium text-ink">Previous attempt scored</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button onClick={() => setPhase("results")}>View results</Button>
                <Button variant="secondary" onClick={() => reset()}>
                  Start a new attempt
                </Button>
              </div>
            </div>
          )}
        </section>

        <aside className="rounded-xl border border-line bg-surface p-6 shadow-[var(--shadow-card)]">
          <h2 className="font-serif text-xl font-medium tracking-tight">Candidate instructions</h2>
          <ol className="mt-4 space-y-3 text-[13.5px] leading-relaxed text-ink-muted">
            {INSTRUCTIONS.map((item, i) => (
              <li key={item} className="flex gap-3">
                <span className="mt-0.5 font-mono text-[11px] text-ink-subtle">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ol>

          <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-md border border-line bg-bg-elevated px-3 py-3 text-sm leading-snug text-ink">
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-accent"
              checked={ready}
              onChange={(e) => setReady(e.target.checked)}
            />
            <span>I have read the instructions and I'm ready to begin.</span>
          </label>

          <Button
            className="mt-4 w-full"
            size="lg"
            disabled={!ready || bankSize < EXAM_LENGTH}
            onClick={startExam}
          >
            Start exam
          </Button>
          {bankSize < EXAM_LENGTH && (
            <p className="mt-2 text-xs text-warn">
              Question bank is still loading. Refresh shortly.
            </p>
          )}
        </aside>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-5xl gap-3 px-5 py-6 text-[12px] leading-relaxed text-ink-subtle">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} />
          <p>
            This is an educational AMC-style mock examination and is not an official
            AMC examination. The adaptive scoring system is a simulation and should
            not be interpreted as an official AMC scaled score or pass/fail
            prediction. Helix CAT is not affiliated with the Australian Medical
            Council.
          </p>
        </div>
      </footer>
    </div>
  );
}
