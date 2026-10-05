export type CourseQuizOption = {
  id: number;
  text: string;
  isCorrect: boolean;
};

export type CourseQuizPayload = {
  questions: {
    id: number;
    text: string;
    options: CourseQuizOption[];
  }[];
  builderMode?: string;
};

/** Read quiz JSON from lesson.quizData and/or lesson.content (legacy saves). */
export function parseLessonQuizData(lesson: {
  contentType?: string;
  quizData?: unknown;
  content?: string | null;
}): CourseQuizPayload | null {
  if ((lesson.contentType || "").toLowerCase() !== "quiz") return null;

  const tryParse = (raw: unknown): CourseQuizPayload | null => {
    if (raw == null) return null;
    let obj: unknown = raw;
    if (typeof raw === "string") {
      try {
        obj = JSON.parse(raw);
      } catch {
        return null;
      }
    }
    if (!obj || typeof obj !== "object") return null;
    const questions = (obj as CourseQuizPayload).questions;
    if (!Array.isArray(questions)) return null;
    return { ...(obj as CourseQuizPayload), questions };
  };

  return tryParse(lesson.quizData) ?? tryParse(lesson.content);
}
