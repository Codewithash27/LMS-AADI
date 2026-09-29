export type ExamType = "theory" | "mcq";

export const OPTION_LETTERS = "ABCDEF";

export function normalizeExamType(value: unknown): ExamType {
  return value === "mcq" ? "mcq" : "theory";
}

export function parseMcqScoreFromFeedback(feedback: string | null | undefined): {
  score: number;
  maxScore: number;
  percent: number;
} | null {
  if (!feedback) return null;
  const m = feedback.match(/Auto-graded MCQ:\s*(\d+)\s*\/\s*(\d+)/i);
  if (!m) return null;
  const score = parseInt(m[1], 10);
  const maxScore = parseInt(m[2], 10);
  if (!Number.isFinite(score) || !Number.isFinite(maxScore) || maxScore <= 0) return null;
  return { score, maxScore, percent: Math.round((score / maxScore) * 100) };
}

export function mcqEncouragement(percent: number): string {
  if (percent >= 80) return "Excellent work!";
  if (percent >= 60) return "Good effort!";
  return "Keep practising!";
}

/** Drop empty option slots; remap correctOption from original indices. */
export function normalizeMcqOptions(
  options: string[],
  correctOption: number | null | undefined
): { options: string[]; correctOption: number | null } {
  const trimmed: string[] = [];
  let newCorrect: number | null = null;
  options.forEach((raw, i) => {
    const t = raw.trim();
    if (!t) return;
    if (correctOption === i) newCorrect = trimmed.length;
    trimmed.push(t);
  });
  return { options: trimmed, correctOption: newCorrect };
}

/** If PDF gave a model answer matching an option but no correct index, infer it. */
export function inferMcqCorrectOption(
  options: string[],
  correctOption: number | null | undefined,
  modelAnswer: string | null | undefined
): number | null {
  if (correctOption != null && correctOption >= 0) return correctOption;
  const key = modelAnswer?.trim();
  if (!key) return null;
  const idx = options.findIndex((o) => o.trim().toLowerCase() === key.toLowerCase());
  return idx >= 0 ? idx : null;
}

export function validateMcqQuestionClient(
  text: string,
  options: string[],
  correctOption: number | null | undefined,
  questionNumber: number
): string | null {
  const { options: trimmed, correctOption: correct } = normalizeMcqOptions(
    options,
    correctOption
  );
  const unique = new Set(trimmed.map((o) => o.toLowerCase()));
  if (!text.trim()) return `Question ${questionNumber}: question text is required.`;
  if (trimmed.length < 2) return `Question ${questionNumber}: provide at least 2 non-empty options.`;
  if (unique.size !== trimmed.length) return `Question ${questionNumber}: options must be unique.`;
  if (correct == null || correct < 0 || correct >= trimmed.length) {
    return `Question ${questionNumber}: select the correct option.`;
  }
  return null;
}
