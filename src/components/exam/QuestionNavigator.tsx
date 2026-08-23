import { EXAM_LENGTH } from "@/lib/exam/types";
import { useExamStore } from "@/lib/exam/store";
import { cn } from "@/lib/utils";

export function QuestionNavigator({
  className,
  onJump,
}: {
  className?: string;
  onJump?: () => void;
}) {
  const sequence = useExamStore((s) => s.sequence);
  const currentIndex = useExamStore((s) => s.currentIndex);
  const answers = useExamStore((s) => s.answers);
  const flagged = useExamStore((s) => s.flagged);
  const goTo = useExamStore((s) => s.goTo);

  return (
    <div className={className}>
      <div className="grid grid-cols-10 gap-1.5">
        {Array.from({ length: EXAM_LENGTH }, (_, i) => {
          const item = sequence[i];
          const locked = !item;
          const isCurrent = i === currentIndex && Boolean(item);
          const isFlagged = item ? flagged.includes(item.questionId) : false;
          const isAnswered = item ? answers[item.questionId] !== undefined : false;
          return (
            <button
              key={i}
              type="button"
              disabled={locked}
              onClick={() => {
                goTo(i);
                onJump?.();
              }}
              className={cn(
                "relative flex size-8 items-center justify-center rounded-sm text-[11px] font-medium tabular-nums",
                locked && "cursor-not-allowed bg-bg text-locked",
                !locked && !isCurrent && !isAnswered && "border border-line bg-surface text-ink-muted",
                !locked && isAnswered && !isCurrent && "bg-accent-soft text-accent",
                isCurrent && "bg-accent text-accent-fg",
              )}
              aria-label={
                locked
                  ? `Question ${i + 1} locked`
                  : `Question ${i + 1}${isAnswered ? ", answered" : ", unanswered"}${isFlagged ? ", flagged" : ""}`
              }
            >
              {i + 1}
              {isFlagged && (
                <span className="absolute right-0.5 top-0.5 size-1.5 rounded-full bg-flag" />
              )}
            </button>
          );
        })}
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] text-ink-muted">
        <li className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-accent" /> Current
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-accent-soft" /> Answered
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm border border-line bg-surface" /> Unanswered
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-bg" /> Not yet presented
        </li>
      </ul>
    </div>
  );
}
