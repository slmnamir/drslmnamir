import type { Question } from "./types";
import raw from "./bank.json";

let cached: Question[] | null = null;
let map: Map<string, Question> | null = null;

export function getQuestionBank(): Question[] {
  if (!cached) {
    cached = raw as unknown as Question[];
  }
  return cached;
}

export function getQuestionMap(): Map<string, Question> {
  if (!map) {
    map = new Map(getQuestionBank().map((q) => [q.id, q]));
  }
  return map;
}

export function getQuestion(id: string): Question | undefined {
  return getQuestionMap().get(id);
}
