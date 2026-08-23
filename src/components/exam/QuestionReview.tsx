import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getQuestionMap } from "@/lib/exam/bank";
import { useExamStore } from "@/lib/exam/store";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

export function QuestionReview() {
  const sequence = useExamStore((s) => s.sequence);
  const answers = useExamStore((s) => s.answers);
  const reviewIndex = useExamStore((s) => s.reviewIndex);
  const setReviewIndex = useExamStore((s) => s.setReviewIndex);
  const setPhase = useExamStore((s) => s.setPhase);
  const item = sequence[reviewIndex];
  const q = item ? getQuestionMap().get(item.questionId) : undefined;
  const chosen = item ? answers[item.questionId] : undefined;

  if (!item || !q) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg">
        <Button onClick={() => setPhase("results")}>Back to results</Button>
      </div>
    );
  }

  const correct = chosen === q.correctAnswer;
  const unanswered = chosen === undefined;

  return (
    <div className="min-h-dvh bg-bg text-ink">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3">
          <Button variant="ghost" onClick={() => setPhase("results")}>
            Back to results
          </Button>
          <p className="text-sm tabular-nums text-ink-muted">
            {reviewIndex + 1} / {sequence.length}
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-8">
        <div className="flex flex-wrap items-center gap-2">
          {unanswered ? (
            <Badge variant="warn">Unanswered</Badge>
          ) : correct ? (
            <Badge variant="success">Correct</Badge>
          ) : (
            <Badge variant="danger">Incorrect</Badge>
          )}
          <Badge variant="muted">{q.domain}</Badge>
          <Badge variant="muted">{q.subdomain}</Badge>
        </div>

        <p className="mt-5 font-serif text-[17px] leading-[1.65] text-ink">{q.clinicalVignette}</p>
        <h2 className="mt-5 text-[15px] font-semibold">{q.question}</h2>

        <ul className="mt-4 space-y-2">
          {item.optionOrder.map((option, i) => {
            const isCorrect = option === q.correctAnswer;
            const isChosen = option === chosen;
            return (
              <li
                key={option}
                className={cn(
                  "flex items-start gap-3 rounded-md border px-4 py-3 text-sm leading-relaxed",
                  isCorrect && "border-success/40 bg-success-soft",
                  isChosen && !isCorrect && "border-danger/40 bg-danger-soft",
                  !isCorrect && !isChosen && "border-line bg-surface",
                )}
              >
                <span className="mt-0.5 font-semibold text-ink-muted">{LETTERS[i]}</span>
                <span>
                  {option}
                  {isCorrect && (
                    <span className="ml-2 text-[11px] font-medium uppercase tracking-wide text-success">
                      Correct
                    </span>
                  )}
                  {isChosen && !isCorrect && (
                    <span className="ml-2 text-[11px] font-medium uppercase tracking-wide text-danger">
                      Your answer
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>

        <section className="mt-8 space-y-5 rounded-lg border border-line bg-surface p-5">
          <Block title="Why this is correct">{q.explanation.whyCorrect}</Block>
          <Block title="Why the other options are wrong">
            <ul className="space-y-2">
              {Object.entries(q.explanation.whyOthersWrong).map(([opt, why]) => (
                <li key={opt}>
                  <span className="font-medium text-ink">{opt}.</span> {why}
                </li>
              ))}
            </ul>
          </Block>
          <Block title="Clinical pearl">{q.keyPearl}</Block>
          <Block title="Common trap">{q.commonTrap}</Block>
          {q.guidelineReference && (
            <p className="text-xs text-ink-subtle">Reference: {q.guidelineReference}</p>
          )}
        </section>

        <div className="mt-8 flex justify-between">
          <Button
            variant="secondary"
            disabled={reviewIndex === 0}
            onClick={() => setReviewIndex(reviewIndex - 1)}
          >
            <ChevronLeft /> Previous
          </Button>
          <Button
            variant="secondary"
            disabled={reviewIndex >= sequence.length - 1}
            onClick={() => setReviewIndex(reviewIndex + 1)}
          >
            Next <ChevronRight />
          </Button>
        </div>
      </main>
    </div>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">{title}</h3>
      <div className="mt-2 text-sm leading-relaxed text-ink-muted">{children}</div>
    </div>
  );
}
