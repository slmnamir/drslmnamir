import { useEffect } from "react";
import { getQuestionMap } from "@/lib/exam/bank";
import { useExamStore } from "@/lib/exam/store";
import { AnalyticsView } from "./AnalyticsView";
import { ExamView } from "./ExamView";
import { Landing } from "./Landing";
import { ProcessingView } from "./ProcessingView";
import { QuestionReview } from "./QuestionReview";
import { ResultsView } from "./ResultsView";
import { ReviewView } from "./ReviewView";

export function ExamApp() {
  const hydrated = useExamStore((s) => s.hydrated);
  const hydrate = useExamStore((s) => s.hydrate);
  const phase = useExamStore((s) => s.phase);

  useEffect(() => {
    void Promise.resolve(useExamStore.persist.rehydrate()).then(() => {
      const s = useExamStore.getState();
      const first = s.sequence[0];
      if (first && !getQuestionMap().has(first.questionId)) {
        s.reset();
        return;
      }
      if (!s.hydrated) hydrate();
    });
  }, [hydrate]);

  if (!hydrated) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg">
        <p className="text-sm tracking-wide text-ink-muted">Loading examination…</p>
      </div>
    );
  }

  if (phase === "landing") return <Landing />;
  if (phase === "exam" || phase === "confirm") return <ExamView />;
  if (phase === "review") return <ReviewView />;
  if (phase === "processing") return <ProcessingView />;
  if (phase === "questionReview") return <QuestionReview />;
  if (phase === "analytics") return <AnalyticsView />;
  if (phase === "results") return <ResultsView />;
  return <Landing />;
}
