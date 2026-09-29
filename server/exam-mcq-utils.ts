import type { Question } from "@shared/schema";
import type { ExamType } from "@shared/schema";

export function normalizeExamType(value: unknown): ExamType {
  return value === "mcq" ? "mcq" : "theory";
}

export function stripQuestionForStudent(q: Question) {
  const { modelAnswer, correctOption, ...rest } = q;
  return rest;
}

function normalizeMcqOptionsServer(
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

export function validateMcqQuestionPayload(
  text: string,
  options: unknown,
  correctOption: unknown,
  questionNumber: number
): { options: string[]; correctOption: number } | { error: string } {
  if (!Array.isArray(options)) {
    return { error: `Question ${questionNumber}: MCQ questions need options.` };
  }
  const raw = options.map((o) => String(o ?? ""));
  const co =
    correctOption == null || typeof correctOption !== "number"
      ? null
      : correctOption;
  const { options: trimmed, correctOption: mapped } = normalizeMcqOptionsServer(raw, co);
  const unique = new Set(trimmed.map((o) => o.toLowerCase()));
  if (trimmed.length < 2) {
    return { error: `Question ${questionNumber}: provide at least 2 non-empty options.` };
  }
  if (unique.size !== trimmed.length) {
    return { error: `Question ${questionNumber}: options must be unique.` };
  }
  if (mapped == null || mapped < 0 || mapped >= trimmed.length) {
    return { error: `Question ${questionNumber}: select a correct option.` };
  }
  if (!text.trim()) {
    return { error: `Question ${questionNumber}: question text is required.` };
  }
  return { options: trimmed, correctOption: mapped };
}

export function gradeMcqAnswers(
  questions: Question[],
  answersRaw: unknown
): {
  score: number;
  maxScore: number;
  feedback: string;
  questionResults: Record<number, boolean>;
} {
  let answers: Record<string, string> = {};
  if (typeof answersRaw === "string") {
    try {
      answers = JSON.parse(answersRaw);
    } catch {
      answers = {};
    }
  } else if (answersRaw && typeof answersRaw === "object") {
    answers = answersRaw as Record<string, string>;
  }

  const gradable = questions.filter(
    (q) =>
      Array.isArray(q.options) &&
      q.options.length >= 2 &&
      q.correctOption != null &&
      q.correctOption >= 0 &&
      q.correctOption < (q.options as string[]).length
  );

  let score = 0;
  const questionResults: Record<number, boolean> = {};

  for (const q of gradable) {
    const opts = q.options as string[];
    const expected = opts[q.correctOption!]?.trim();
    const student =
      answers[String(q.id)] ??
      (answers as Record<number, string>)[q.id as unknown as number] ??
      "";
    const ok =
      expected != null &&
      student.trim().length > 0 &&
      student.trim().toLowerCase() === expected.toLowerCase();
    questionResults[q.id] = ok;
    if (ok) score++;
  }

  const maxScore = gradable.length;
  const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  const feedback = `Auto-graded MCQ: ${score} / ${maxScore} correct (${pct}%).`;

  return { score, maxScore, feedback, questionResults };
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
