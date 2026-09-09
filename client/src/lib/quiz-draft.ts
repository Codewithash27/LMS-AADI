export type QuizDraft = {
  selectedOptions: number[];
  currentQuestionIndex: number;
  timeLeftSeconds: number;
  violations: number;
  savedAt: number;
};

export function quizDraftKey(courseId: number, moduleId: number, lessonId: number) {
  return `lms-quiz-draft:${courseId}:${moduleId}:${lessonId}`;
}

export function loadQuizDraft(
  courseId: number,
  moduleId: number,
  lessonId: number
): QuizDraft | null {
  try {
    const raw = localStorage.getItem(quizDraftKey(courseId, moduleId, lessonId));
    if (!raw) return null;
    const data = JSON.parse(raw) as QuizDraft;
    if (
      !Array.isArray(data.selectedOptions) ||
      typeof data.timeLeftSeconds !== "number" ||
      data.timeLeftSeconds <= 0
    ) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function saveQuizDraft(
  courseId: number,
  moduleId: number,
  lessonId: number,
  draft: Omit<QuizDraft, "savedAt">
) {
  const payload: QuizDraft = { ...draft, savedAt: Date.now() };
  localStorage.setItem(
    quizDraftKey(courseId, moduleId, lessonId),
    JSON.stringify(payload)
  );
}

export function clearQuizDraft(
  courseId: number,
  moduleId: number,
  lessonId: number
) {
  localStorage.removeItem(quizDraftKey(courseId, moduleId, lessonId));
}

export function hasQuizDraft(
  courseId: number,
  moduleId: number,
  lessonId: number
) {
  return loadQuizDraft(courseId, moduleId, lessonId) != null;
}
