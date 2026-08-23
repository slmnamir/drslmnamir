import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EXAM_LENGTH } from "@/lib/exam/types";
import { useExamStore } from "@/lib/exam/store";
import { formatDuration } from "@/lib/exam/scoring";
import { QuestionNavigator } from "./QuestionNavigator";

export function ReviewView() {
  const sequence = useExamStore((s) => s.sequence);
  const answers = useExamStore((s) => s.answers);
  const flagged = useExamStore((s) => s.flagged);
  const deadline = useExamStore((s) => s.deadline);
  const tick = useExamStore((s) => s.tick);
  const returnToExam = useExamStore((s) => s.returnToExam);
  const submit = useExamStore((s) => s.submit);
  const [confirm, setConfirm] = useState(false);

  const answered = sequence.filter((s) => answers[s.questionId] !== undefined).length;
  const unanswered = sequence.length - answered;
  const remaining = Math.max(0, (deadline ?? 0) - Date.now());
  const locked = EXAM_LENGTH - sequence.length;

  useEffect(() => {
    const id = window.setInterval(() => tick(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [tick]);

  return (
    <div className="min-h-dvh bg-bg text-ink">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-subtle">
              AMC 1 CAT MOCK
            </p>
            <h1 className="font-serif text-2xl font-medium tracking-tight">Examination review</h1>
          </div>
          <p className="font-mono text-lg tabular-nums">{formatDuration(remaining)}</p>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-8">
        <div className="grid gap-3 sm:grid-cols-4">
          <Stat label="Total questions" value={`${EXAM_LENGTH}`} />
          <Stat label="Answered" value={`${answered}/${sequence.length}`} />
          <Stat label="Unanswered" value={`${unanswered}`} warn={unanswered > 0} />
          <Stat label="Flagged" value={`${flagged.length}`} />
        </div>

        {unanswered > 0 && (
          <p className="mt-5 rounded-md border border-warn/30 bg-warn-soft px-4 py-3 text-sm text-warn">
            {unanswered} unlocked question{unanswered === 1 ? "" : "s"} remain unanswered.
            Unanswered items score as incorrect.
          </p>
        )}
        {locked > 0 && (
          <p className="mt-3 text-sm text-ink-muted">
            {locked} question{locked === 1 ? "" : "s"} have not yet been presented. Return to the
            examination and use Next to continue the adaptive sequence before submitting.
          </p>
        )}

        <div className="mt-8 rounded-lg border border-line bg-surface p-5">
          <QuestionNavigator />
        </div>

        <div className="mt-8 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => returnToExam()}>
            Return to exam
          </Button>
          <Button onClick={() => setConfirm(true)} disabled={sequence.length < EXAM_LENGTH}>
            Submit final attempt
          </Button>
        </div>
      </main>

      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit examination?</DialogTitle>
            <DialogDescription>
              Once submitted, this attempt cannot be resumed. Explanations will then be available.
              {unanswered > 0
                ? ` ${unanswered} unanswered item${unanswered === 1 ? "" : "s"} will score as incorrect.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfirm(false)}>
              Continue reviewing
            </Button>
            <Button onClick={submit}>Submit examination</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-md border border-line bg-surface px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.14em] text-ink-subtle">{label}</p>
      <p className={`mt-1 font-serif text-2xl tabular-nums ${warn ? "text-warn" : "text-ink"}`}>
        {value}
      </p>
    </div>
  );
}
