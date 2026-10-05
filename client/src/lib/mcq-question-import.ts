import { normalizeMcqOptions, sanitizeMcqQuestionStem } from "@/lib/exam-mcq";

export type ParsedMcqQuestion = {
  text: string;
  modelAnswer?: string | null;
  imageUrl?: string | null;
  options?: string[];
  correctOption?: number;
};

export type CourseQuizQuestion = {
  id: number;
  text: string;
  options: { id: number; text: string; isCorrect: boolean }[];
};

export function shufflePick<T>(items: T[], count: number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(count, copy.length));
}

/** Map parsed document MCQs into course lesson quiz shape (options + correct flags). */
export function buildCourseQuizQuestionsFromPool(
  pool: ParsedMcqQuestion[],
  count: number,
  startId = 1
): CourseQuizQuestion[] {
  const picked = shufflePick(pool, count);
  return picked.map((q, index) => {
    const rawOpts = q.options?.length ? q.options : ["", "", "", ""];
    const { options: normalized, correctOption } = normalizeMcqOptions(
      rawOpts,
      q.correctOption ?? null
    );
    const opts =
      normalized.length >= 2
        ? normalized
        : rawOpts.map((o) => o.trim()).filter(Boolean);
    const stem = sanitizeMcqQuestionStem(q.text, opts);
    const correctIdx =
      correctOption != null && correctOption >= 0 && correctOption < opts.length
        ? correctOption
        : 0;

    const options = opts.map((text, i) => ({
      id: i + 1,
      text,
      isCorrect: i === correctIdx,
    }));
    while (options.length < 4) {
      options.push({ id: options.length + 1, text: "", isCorrect: false });
    }

    return {
      id: startId + index,
      text: stem,
      options: options.slice(0, 6),
    };
  });
}

export async function parseMcqQuestionsFile(file: File): Promise<{
  questions: ParsedMcqQuestion[];
  fileName: string;
  parseStats?: { total: number; withOptions: number; withCorrect: number };
}> {
  const nameLower = file.name.toLowerCase();
  if (
    !nameLower.endsWith(".pdf") &&
    !nameLower.endsWith(".docx") &&
    !nameLower.endsWith(".doc")
  ) {
    throw new Error("Please upload a PDF (.pdf) or Word (.docx) file.");
  }

  const body = new FormData();
  body.append("file", file);
  const res = await fetch("/api/exams/parse-questions-file", {
    method: "POST",
    body,
    credentials: "include",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || "Failed to parse document");
  }
  return {
    questions: data.questions || [],
    fileName: data.fileName || file.name,
    parseStats: data.parseStats,
  };
}
