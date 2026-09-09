export type QuizScoreRecord = {
  id: string;
  courseId: number;
  moduleId: number;
  lessonId: number;
  lessonTitle: string;
  courseTitle: string;
  attemptNumber: number;
  score: number;
  total: number;
  percent: number;
  completedAt: string;
};

export function quizAttemptsKey(courseId: number, moduleId: number, lessonId: number) {
  return `lms-quiz-attempts:${courseId}:${moduleId}:${lessonId}`;
}

const SCORE_HISTORY_KEY = "lms-quiz-score-history";

function lessonKey(courseId: number, moduleId: number, lessonId: number) {
  return `${courseId}:${moduleId}:${lessonId}`;
}

/** How many times the student has submitted this quiz */
export function getQuizAttempts(
  courseId: number,
  moduleId: number,
  lessonId: number
): number {
  // Prefer score-history length so counter never drifts ahead of saved attempts
  const fromHistory = getQuizScoresForLesson(courseId, moduleId, lessonId).length;
  try {
    const raw = localStorage.getItem(quizAttemptsKey(courseId, moduleId, lessonId));
    const n = raw ? parseInt(raw, 10) : 0;
    const fromCounter = Number.isFinite(n) && n > 0 ? n : 0;
    return Math.max(fromHistory, fromCounter);
  } catch {
    return fromHistory;
  }
}

export function setQuizAttempts(
  courseId: number,
  moduleId: number,
  lessonId: number,
  count: number
) {
  localStorage.setItem(
    quizAttemptsKey(courseId, moduleId, lessonId),
    String(Math.max(0, count))
  );
}

/** Call after a successful submit — returns the new attempt total */
export function incrementQuizAttempts(
  courseId: number,
  moduleId: number,
  lessonId: number
): number {
  const next = getQuizAttempts(courseId, moduleId, lessonId) + 1;
  setQuizAttempts(courseId, moduleId, lessonId, next);
  return next;
}

export function getAllQuizScores(): QuizScoreRecord[] {
  try {
    const raw = localStorage.getItem(SCORE_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Normalize: ensure chronological attempt numbers per lesson are consistent
    return normalizeAttemptNumbers(parsed as QuizScoreRecord[]);
  } catch {
    return [];
  }
}

export function getQuizScoresForLesson(
  courseId: number,
  moduleId: number,
  lessonId: number
): QuizScoreRecord[] {
  try {
    const raw = localStorage.getItem(SCORE_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as QuizScoreRecord[])
      .filter(
        (r) =>
          r.courseId === courseId &&
          r.moduleId === moduleId &&
          r.lessonId === lessonId
      )
      .sort(
        (a, b) =>
          new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
      );
  } catch {
    return [];
  }
}

/**
 * Re-number attempts per lesson by completion time (oldest = 1).
 * Keeps every saved attempt visible as Attempt 1, 2, 3…
 */
function normalizeAttemptNumbers(records: QuizScoreRecord[]): QuizScoreRecord[] {
  const byLesson = new Map<string, QuizScoreRecord[]>();
  for (const r of records) {
    const key = lessonKey(r.courseId, r.moduleId, r.lessonId);
    if (!byLesson.has(key)) byLesson.set(key, []);
    byLesson.get(key)!.push(r);
  }

  const remapped = new Map<string, number>();
  byLesson.forEach((list) => {
    const sorted = [...list].sort(
      (a, b) =>
        new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
    );
    sorted.forEach((r, i) => remapped.set(r.id, i + 1));
  });

  return records.map((r) => ({
    ...r,
    attemptNumber: remapped.get(r.id) ?? r.attemptNumber,
  }));
}

export function recordQuizScore(input: {
  courseId: number;
  moduleId: number;
  lessonId: number;
  lessonTitle: string;
  courseTitle: string;
  attemptNumber?: number;
  score: number;
  total: number;
}): QuizScoreRecord {
  const existing = getRawQuizScores();
  const priorForLesson = existing.filter(
    (r) =>
      r.courseId === input.courseId &&
      r.moduleId === input.moduleId &&
      r.lessonId === input.lessonId
  ).length;
  // Always append as next chronological attempt for this lesson
  const attemptNumber = priorForLesson + 1;
  const percent =
    input.total > 0 ? Math.round((input.score / input.total) * 100) : 0;
  const record: QuizScoreRecord = {
    id: `${input.courseId}-${input.moduleId}-${input.lessonId}-${attemptNumber}-${Date.now()}`,
    courseId: input.courseId,
    moduleId: input.moduleId,
    lessonId: input.lessonId,
    lessonTitle: input.lessonTitle,
    courseTitle: input.courseTitle,
    attemptNumber,
    score: input.score,
    total: input.total,
    percent,
    completedAt: new Date().toISOString(),
  };

  const next = [record, ...existing];
  localStorage.setItem(SCORE_HISTORY_KEY, JSON.stringify(next.slice(0, 200)));
  setQuizAttempts(input.courseId, input.moduleId, input.lessonId, attemptNumber);
  return record;
}

function getRawQuizScores(): QuizScoreRecord[] {
  try {
    const raw = localStorage.getItem(SCORE_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as QuizScoreRecord[]) : [];
  } catch {
    return [];
  }
}

export type QuizScoreGroup = {
  key: string;
  courseId: number;
  moduleId: number;
  lessonId: number;
  lessonTitle: string;
  courseTitle: string;
  attempts: QuizScoreRecord[]; // oldest → newest
  latest: QuizScoreRecord;
  bestPercent: number;
};

/** Group all attempts by quiz lesson so every attempt stays visible */
export function getQuizScoresGrouped(): QuizScoreGroup[] {
  const all = getAllQuizScores();
  const map = new Map<string, QuizScoreRecord[]>();

  for (const r of all) {
    const key = lessonKey(r.courseId, r.moduleId, r.lessonId);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  }

  const groups: QuizScoreGroup[] = [];
  map.forEach((list, key) => {
    const attempts = [...list].sort(
      (a, b) =>
        new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
    );
    const latest = attempts[attempts.length - 1];
    groups.push({
      key,
      courseId: latest.courseId,
      moduleId: latest.moduleId,
      lessonId: latest.lessonId,
      lessonTitle: latest.lessonTitle,
      courseTitle: latest.courseTitle,
      attempts,
      latest,
      bestPercent: Math.max(...attempts.map((a) => a.percent)),
    });
  });

  // Most recently attempted quizzes first
  return groups.sort(
    (a, b) =>
      new Date(b.latest.completedAt).getTime() -
      new Date(a.latest.completedAt).getTime()
  );
}

/** Latest score per quiz lesson (for summary cards) */
export function getLatestQuizScoresByLesson(): QuizScoreRecord[] {
  return getQuizScoresGrouped().map((g) => g.latest);
}
