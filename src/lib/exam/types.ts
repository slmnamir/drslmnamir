export const DOMAINS = [
  "Medicine",
  "Surgery",
  "Emergency",
  "Paediatrics",
  "Obstetrics & Gynaecology",
  "Psychiatry",
  "General Practice",
  "Public Health",
  "Ethics & Professionalism",
] as const;

export type Domain = (typeof DOMAINS)[number];

export type Difficulty = "easy" | "moderate" | "difficult";

export type ExamPhase =
  | "landing"
  | "exam"
  | "review"
  | "confirm"
  | "processing"
  | "results"
  | "questionReview"
  | "analytics";

export interface Question {
  id: string;
  question: string;
  clinicalVignette: string;
  options: string[];
  correctAnswer: string;
  explanation: {
    whyCorrect: string;
    whyOthersWrong: Record<string, string>;
  };
  clinicalReasoning: string;
  domain: Domain;
  subdomain: string;
  difficulty: Difficulty;
  discrimination: number;
  estimatedDifficulty: number;
  guessing: number;
  learningObjective: string;
  guidelineReference: string | null;
  keyPearl: string;
  commonTrap: string;
}

export interface AdministeredItem {
  questionId: string;
  optionOrder: string[];
  openedAt: number;
}

export interface ExamResult {
  correct: number;
  incorrect: number;
  unanswered: number;
  percentage: number;
  theta: number;
  domainStats: DomainStat[];
  difficultyStats: DifficultyStat[];
  subdomainStats: SubdomainStat[];
  timePerQuestionMs: Record<string, number>;
  averageTimeMs: number;
  fastestMs: number;
  slowestMs: number;
  flaggedCorrect: number;
  flaggedTotal: number;
  strongAreas: string[];
  weakAreas: string[];
  recommendations: string[];
  submittedAt: number;
}

export interface DomainStat {
  domain: Domain;
  correct: number;
  total: number;
  percentage: number;
}

export interface DifficultyStat {
  difficulty: Difficulty;
  correct: number;
  total: number;
  percentage: number;
}

export interface SubdomainStat {
  domain: Domain;
  subdomain: string;
  correct: number;
  total: number;
  percentage: number;
}

export const EXAM_LENGTH = 150;
export const EXAM_DURATION_MS = 210 * 60 * 1000; // 3.5 hours
export const STORAGE_KEY = "helix-cat-amc-attempt-v1";

export const BLUEPRINT: Record<Domain, number> = {
  Medicine: 0.25,
  Surgery: 0.15,
  Emergency: 0.12,
  Paediatrics: 0.12,
  "Obstetrics & Gynaecology": 0.12,
  Psychiatry: 0.08,
  "General Practice": 0.1,
  "Public Health": 0.03,
  "Ethics & Professionalism": 0.03,
};

export const TIMER_WARNINGS_MS = [
  60 * 60 * 1000,
  30 * 60 * 1000,
  10 * 60 * 1000,
  5 * 60 * 1000,
];
