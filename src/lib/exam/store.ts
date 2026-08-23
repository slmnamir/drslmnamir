import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getQuestionBank, getQuestionMap } from "./bank";
import { abilityFromAnswers, hashString, mulberry32, selectNextQuestion, shuffle } from "./cat";
import { scoreAttempt } from "./scoring";
import {
  EXAM_DURATION_MS,
  EXAM_LENGTH,
  STORAGE_KEY,
  type AdministeredItem,
  type ExamPhase,
  type ExamResult,
  type Question,
} from "./types";

export interface ExamState {
  attemptId: string | null;
  seed: number;
  phase: ExamPhase;
  deadline: number | null;
  sequence: AdministeredItem[];
  currentIndex: number;
  answers: Record<string, string>;
  flagged: string[];
  timeSpentMs: Record<string, number>;
  lastTickAt: number | null;
  theta: number;
  warningsShown: number[];
  result: ExamResult | null;
  reviewIndex: number;
  hydrated: boolean;

  hydrate: () => void;
  startExam: () => void;
  selectAnswer: (option: string) => void;
  toggleFlag: () => void;
  goTo: (index: number) => void;
  next: () => void;
  prev: () => void;
  openReview: () => void;
  returnToExam: (index?: number) => void;
  requestSubmit: () => void;
  cancelSubmit: () => void;
  submit: () => void;
  tick: (now: number) => void;
  acknowledgeWarning: (ms: number) => void;
  setReviewIndex: (index: number) => void;
  setPhase: (phase: ExamPhase) => void;
  reset: () => void;
}

const empty = {
  attemptId: null as string | null,
  seed: 0,
  phase: "landing" as ExamPhase,
  deadline: null as number | null,
  sequence: [] as AdministeredItem[],
  currentIndex: 0,
  answers: {} as Record<string, string>,
  flagged: [] as string[],
  timeSpentMs: {} as Record<string, number>,
  lastTickAt: null as number | null,
  theta: 0,
  warningsShown: [] as number[],
  result: null as ExamResult | null,
  reviewIndex: 0,
  hydrated: true,
};

function domainCounts(sequence: AdministeredItem[], byId: Map<string, Question>) {
  const counts: Record<string, number> = {};
  for (const item of sequence) {
    const q = byId.get(item.questionId);
    if (!q) continue;
    counts[q.domain] = (counts[q.domain] ?? 0) + 1;
  }
  return counts;
}

function accrueTime(state: ExamState, now: number): Record<string, number> {
  const current = state.sequence[state.currentIndex];
  if (!current || state.lastTickAt == null) return state.timeSpentMs;
  const delta = Math.max(0, now - state.lastTickAt);
  const id = current.questionId;
  return { ...state.timeSpentMs, [id]: (state.timeSpentMs[id] ?? 0) + delta };
}

function pushNext(
  state: ExamState,
  now: number,
): Pick<ExamState, "sequence" | "currentIndex" | "theta" | "lastTickAt"> | null {
  const bank = getQuestionBank();
  const byId = getQuestionMap();
  const used = new Set(state.sequence.map((s) => s.questionId));
  const rng = mulberry32(state.seed + state.sequence.length * 9973 + 13);
  const { theta } = abilityFromAnswers(
    state.sequence.map((s) => s.questionId),
    state.answers,
    byId,
  );
  const next = selectNextQuestion(
    bank,
    used,
    theta,
    domainCounts(state.sequence, byId),
    state.sequence.length,
    rng,
  );
  if (!next) return null;
  const optionOrder = shuffle(next.options.slice(), rng);
  const item: AdministeredItem = {
    questionId: next.id,
    optionOrder,
    openedAt: now,
  };
  return {
    sequence: [...state.sequence, item],
    currentIndex: state.sequence.length,
    theta,
    lastTickAt: now,
  };
}

export const useExamStore = create<ExamState>()(
  persist(
    (set, get) => ({
      ...empty,

      hydrate: () => set({ hydrated: true }),

      startExam: () => {
        const now = Date.now();
        const seed = (now ^ hashString(crypto.randomUUID())) >>> 0;
        const bank = getQuestionBank();
        const rng = mulberry32(seed);
        const first = selectNextQuestion(bank, new Set(), 0, {}, 0, rng);
        if (!first) return;
        const optionOrder = shuffle(first.options.slice(), rng);
        set({
          attemptId: `HX-${seed.toString(16).toUpperCase()}`,
          seed,
          phase: "exam",
          deadline: now + EXAM_DURATION_MS,
          sequence: [
            {
              questionId: first.id,
              optionOrder,
              openedAt: now,
            },
          ],
          currentIndex: 0,
          answers: {},
          flagged: [],
          timeSpentMs: {},
          lastTickAt: now,
          theta: 0,
          warningsShown: [],
          result: null,
          reviewIndex: 0,
          hydrated: true,
        });
      },

      selectAnswer: (option) => {
        const { sequence, currentIndex } = get();
        const item = sequence[currentIndex];
        if (!item) return;
        set({ answers: { ...get().answers, [item.questionId]: option } });
      },

      toggleFlag: () => {
        const { sequence, currentIndex, flagged } = get();
        const item = sequence[currentIndex];
        if (!item) return;
        const id = item.questionId;
        set({
          flagged: flagged.includes(id) ? flagged.filter((f) => f !== id) : [...flagged, id],
        });
      },

      goTo: (index) => {
        const state = get();
        if (index < 0 || index >= state.sequence.length) return;
        const now = Date.now();
        set({
          timeSpentMs: accrueTime(state, now),
          currentIndex: index,
          lastTickAt: now,
          phase: "exam",
        });
      },

      next: () => {
        const state = get();
        const now = Date.now();
        const timeSpentMs = accrueTime(state, now);
        if (state.currentIndex < state.sequence.length - 1) {
          set({
            timeSpentMs,
            currentIndex: state.currentIndex + 1,
            lastTickAt: now,
          });
          return;
        }
        if (state.sequence.length >= EXAM_LENGTH) {
          set({ timeSpentMs, lastTickAt: now, phase: "confirm" });
          return;
        }
        const pushed = pushNext({ ...state, timeSpentMs }, now);
        if (!pushed) {
          set({ timeSpentMs, lastTickAt: now, phase: "confirm" });
          return;
        }
        set({ ...pushed, timeSpentMs, phase: "exam" });
      },

      prev: () => {
        const state = get();
        if (state.currentIndex <= 0) return;
        const now = Date.now();
        set({
          timeSpentMs: accrueTime(state, now),
          currentIndex: state.currentIndex - 1,
          lastTickAt: now,
        });
      },

      openReview: () => {
        const state = get();
        const now = Date.now();
        set({
          timeSpentMs: accrueTime(state, now),
          lastTickAt: now,
          phase: "review",
        });
      },

      returnToExam: (index) => {
        const state = get();
        const now = Date.now();
        set({
          timeSpentMs: accrueTime(state, now),
          lastTickAt: now,
          currentIndex:
            index !== undefined && index >= 0 && index < state.sequence.length
              ? index
              : state.currentIndex,
          phase: "exam",
        });
      },

      requestSubmit: () => set({ phase: "confirm" }),
      cancelSubmit: () => {
        const state = get();
        set({ phase: state.sequence.length >= EXAM_LENGTH ? "review" : "exam" });
      },

      submit: () => {
        const state = get();
        const now = Date.now();
        const timeSpentMs = accrueTime(state, now);
        const byId = getQuestionMap();
        const result = scoreAttempt(
          state.sequence.map((s) => s.questionId),
          state.answers,
          state.flagged,
          timeSpentMs,
          byId,
        );
        set({
          timeSpentMs,
          lastTickAt: now,
          result,
          phase: "processing",
          theta: result.theta,
        });
      },

      tick: (now) => {
        const state = get();
        if (state.phase !== "exam" && state.phase !== "review" && state.phase !== "confirm") {
          return;
        }
        if (state.deadline != null && now >= state.deadline) {
          const timeSpentMs = accrueTime(state, now);
          const byId = getQuestionMap();
          const result = scoreAttempt(
            state.sequence.map((s) => s.questionId),
            state.answers,
            state.flagged,
            timeSpentMs,
            byId,
          );
          set({
            timeSpentMs,
            lastTickAt: now,
            result,
            phase: "processing",
            theta: result.theta,
          });
          return;
        }
        set({ timeSpentMs: accrueTime(state, now), lastTickAt: now });
      },

      acknowledgeWarning: (ms) => {
        const { warningsShown } = get();
        if (warningsShown.includes(ms)) return;
        set({ warningsShown: [...warningsShown, ms] });
      },

      setReviewIndex: (index) => set({ reviewIndex: index, phase: "questionReview" }),
      setPhase: (phase) => set({ phase }),
      reset: () => set({ ...empty, hydrated: true, phase: "landing" }),
    }),
    {
      name: STORAGE_KEY,
      skipHydration: true,
      partialize: (s) => ({
        attemptId: s.attemptId,
        seed: s.seed,
        phase: s.phase === "processing" ? "results" : s.phase === "confirm" ? "review" : s.phase,
        deadline: s.deadline,
        sequence: s.sequence,
        currentIndex: s.currentIndex,
        answers: s.answers,
        flagged: s.flagged,
        timeSpentMs: s.timeSpentMs,
        lastTickAt: s.lastTickAt,
        theta: s.theta,
        warningsShown: s.warningsShown,
        result: s.result,
        reviewIndex: s.reviewIndex,
      }),
    },
  ),
);

export function currentQuestion(state: ExamState): Question | null {
  const item = state.sequence[state.currentIndex];
  if (!item) return null;
  return getQuestionMap().get(item.questionId) ?? null;
}
