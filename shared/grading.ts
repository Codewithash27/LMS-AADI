export type ExamType = "theory" | "mcq";

export type GradingTone = "progress" | "needs" | "graded";

export type AttemptGradingInput = {
  completedAt?: string | Date | null;
  reviewedAt?: string | Date | null;
  examType?: unknown;
  score?: number | null;
  maxScore?: number | null;
  feedback?: string | null;
};

export function normalizeExamType(value: unknown): ExamType {
  return value === "mcq" ? "mcq" : "theory";
}

/** Theory exams need instructor review after submit; MCQ is auto-graded on submit. */
export function requiresManualGrading(examType: unknown): boolean {
  return normalizeExamType(examType) === "theory";
}

export function isAttemptCompleted(attempt: Pick<AttemptGradingInput, "completedAt">): boolean {
  return attempt.completedAt != null && attempt.completedAt !== "";
}

export function isPendingManualReview(attempt: AttemptGradingInput): boolean {
  if (!isAttemptCompleted(attempt)) return false;
  if (!requiresManualGrading(attempt.examType)) return false;
  return attempt.reviewedAt == null;
}

export function getAttemptGradingMeta(attempt: AttemptGradingInput): {
  tone: GradingTone;
  label: string;
  requiresManualGrading: boolean;
} {
  if (!isAttemptCompleted(attempt)) {
    return { tone: "progress", label: "In progress", requiresManualGrading: false };
  }

  const manual = requiresManualGrading(attempt.examType);
  if (!manual) {
    return { tone: "graded", label: "Auto-graded", requiresManualGrading: false };
  }

  if (attempt.reviewedAt != null) {
    return { tone: "graded", label: "Graded", requiresManualGrading: true };
  }

  return { tone: "needs", label: "Needs grading", requiresManualGrading: true };
}
