import { useEffect } from "react";
import { useExamStore } from "@/lib/exam/store";

export function ProcessingView() {
  const setPhase = useExamStore((s) => s.setPhase);

  useEffect(() => {
    const t = window.setTimeout(() => setPhase("results"), 1100);
    return () => window.clearTimeout(t);
  }, [setPhase]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-bg px-6 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">Helix CAT</p>
      <h1 className="mt-3 font-serif text-3xl font-medium tracking-tight text-ink">
        Scoring your attempt
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-muted">
        Calculating raw score, domain performance, and the internal ability estimate.
      </p>
      <div className="mt-8 h-1 w-48 overflow-hidden rounded-full bg-line">
        <div className="h-full w-1/2 animate-pulse bg-accent" />
      </div>
    </div>
  );
}
