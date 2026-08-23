import { useEffect, useState } from "react";
import { Flag, Grid3x3, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { currentQuestion, useExamStore } from "@/lib/exam/store";
import { EXAM_LENGTH, TIMER_WARNINGS_MS } from "@/lib/exam/types";
import { formatDuration } from "@/lib/exam/scoring";
import { QuestionNavigator } from "./QuestionNavigator";
import { cn } from "@/lib/utils";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

export function ExamView() {
  const state = useExamStore();
  const question = currentQuestion(state);
  const item = state.sequence[state.currentIndex];
  const [navOpen, setNavOpen] = useState(false);
  const remaining = Math.max(0, (state.deadline ?? 0) - Date.now());
  const answered = Object.keys(state.answers).filter((id) =>
    state.sequence.some((s) => s.questionId === id),
  ).length;
  const progress = (state.sequence.length / EXAM_LENGTH) * 100;
  const low = remaining <= 10 * 60 * 1000;
  const critical = remaining <= 5 * 60 * 1000;
  const selected = item ? state.answers[item.questionId] : undefined;
  const flagged = item ? state.flagged.includes(item.questionId) : false;
  const isLastUnlocked = state.currentIndex === state.sequence.length - 1;
  const atExamEnd = state.sequence.length >= EXAM_LENGTH && isLastUnlocked;

  const pendingWarning = TIMER_WARNINGS_MS.find(
    (ms) => remaining <= ms && !state.warningsShown.includes(ms),
  );

  useEffect(() => {
    const id = window.setInterval(() => useExamStore.getState().tick(Date.now()), 500);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!pendingWarning) return;
    const t = window.setTimeout(
      () => useExamStore.getState().acknowledgeWarning(pendingWarning),
      8000,
    );
    return () => window.clearTimeout(t);
  }, [pendingWarning]);

  useEffect(() => {
    const onLeave = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, []);

  if (!question || !item) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg text-sm text-ink-muted">
        Loading item…
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-ink">
      <header className="sticky top-0 z-30 border-b border-line bg-surface">
        <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-3 py-2.5 sm:px-5">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-subtle">
              AMC 1 CAT MOCK
            </p>
            <p className="font-medium tabular-nums text-ink">
              Question {state.currentIndex + 1} of {EXAM_LENGTH}
            </p>
          </div>
          <div className="hidden min-w-[160px] flex-1 md:block">
            <Progress value={progress} />
            <p className="mt-1 text-center text-[11px] tabular-nums text-ink-subtle">
              {answered} answered · {state.sequence.length} unlocked
            </p>
          </div>
          <div
            className={cn(
              "rounded-sm px-3 py-1.5 font-mono text-lg font-medium tabular-nums",
              critical
                ? "bg-danger-soft text-danger"
                : low
                  ? "bg-warn-soft text-warn"
                  : "bg-bg text-ink",
            )}
            aria-live="polite"
          >
            {formatDuration(remaining)}
          </div>
          <Button
            variant="secondary"
            size="icon"
            className="lg:hidden"
            onClick={() => setNavOpen(true)}
            aria-label="Open question navigator"
          >
            <Grid3x3 />
          </Button>
        </div>
        {pendingWarning && (
          <div className="bg-warn-soft px-4 py-2 text-center text-sm font-medium text-warn">
            {pendingWarning / 60000} minutes remaining
          </div>
        )}
      </header>

      <div className="mx-auto flex w-full max-w-[1400px] flex-1">
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-8">
          <article className="mx-auto max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-subtle">
              Clinical vignette
            </p>
            <div className="mt-3 rounded-lg border border-line bg-surface px-5 py-5 shadow-[var(--shadow-card)]">
              <p className="font-serif text-[17px] leading-[1.65] text-ink">{question.clinicalVignette}</p>
            </div>
            <h2 className="mt-6 text-[15px] font-semibold leading-snug text-ink">{question.question}</h2>
            <ul className="mt-4 space-y-2.5">
              {item.optionOrder.map((option, i) => {
                const isOn = selected === option;
                return (
                  <li key={option}>
                    <button
                      type="button"
                      onClick={() => state.selectAnswer(option)}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-md border px-4 py-3.5 text-left transition-[border-color,background-color,box-shadow] duration-150",
                        isOn
                          ? "border-accent bg-accent-soft shadow-[0_0_0_1px_var(--color-accent)]"
                          : "border-line bg-surface hover:border-line-strong hover:bg-bg-elevated",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                          isOn
                            ? "border-accent bg-accent text-accent-fg"
                            : "border-line text-ink-muted",
                        )}
                      >
                        {LETTERS[i]}
                      </span>
                      <span className="text-[14.5px] leading-relaxed text-ink">{option}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </article>
        </main>

        <aside className="hidden w-[22rem] shrink-0 border-l border-line bg-surface lg:block">
          <div className="sticky top-[57px] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-subtle">
              Question navigator
            </p>
            <QuestionNavigator className="mt-3" />
            <Button variant="outline" className="mt-4 w-full" onClick={state.openReview}>
              Review answers
            </Button>
          </div>
        </aside>
      </div>

      <footer className="sticky bottom-0 border-t border-line bg-surface">
        <div className="mx-auto flex max-w-[1400px] items-center gap-2 px-3 py-3 sm:px-5">
          <Button
            variant="secondary"
            onClick={state.prev}
            disabled={state.currentIndex === 0}
            className="min-w-11"
          >
            <ChevronLeft />
            <span className="hidden sm:inline">Previous</span>
          </Button>
          <Button
            variant={flagged ? "default" : "outline"}
            onClick={state.toggleFlag}
            className="min-w-11"
          >
            <Flag className={flagged ? "fill-current" : ""} />
            <span className="hidden sm:inline">{flagged ? "Flagged" : "Flag question"}</span>
          </Button>
          <div className="flex-1" />
          <Button onClick={state.next}>
            {atExamEnd ? "Finish examination" : "Next"}
            <ChevronRight />
          </Button>
        </div>
      </footer>

      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Question navigator</SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto p-4">
            <QuestionNavigator onJump={() => setNavOpen(false)} />
            <Button
              variant="outline"
              className="mt-4 w-full"
              onClick={() => {
                setNavOpen(false);
                state.openReview();
              }}
            >
              Review answers
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={state.phase === "confirm"} onOpenChange={(o) => !o && state.cancelSubmit()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>You have reached the end of the examination.</DialogTitle>
            <DialogDescription>
              You can review your answers before submitting. Are you ready to submit?
              Unanswered questions will score as incorrect.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={state.openReview}>
              Review answers
            </Button>
            <Button onClick={state.submit}>Submit examination</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
