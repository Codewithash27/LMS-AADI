import type { ExamFormValues } from "@/lib/form-schemas";

export type ExamEditorStep = "basics" | "source" | "questions";

type StepDef = { id: ExamEditorStep; n: string; title: string; hint: string };

const CREATE_STEPS: StepDef[] = [
  { id: "basics", n: "1", title: "Basics", hint: "Type, course, timing" },
  { id: "source", n: "2", title: "Source", hint: "Type or upload" },
  { id: "questions", n: "3", title: "Questions", hint: "Build the paper" },
];

const EDIT_STEPS: StepDef[] = [
  { id: "basics", n: "1", title: "Basics", hint: "Type, course, timing" },
  { id: "questions", n: "2", title: "Questions", hint: "Edit the paper" },
];

type ExamStepRailProps = {
  mode: "create" | "edit";
  step: ExamEditorStep;
  stepErrors: Partial<Record<ExamEditorStep, boolean>>;
  onChange: (step: ExamEditorStep) => void;
};

export function ExamStepRail({ mode, step, stepErrors, onChange }: ExamStepRailProps) {
  const steps = mode === "edit" ? EDIT_STEPS : CREATE_STEPS;

  return (
    <>
      <nav className="ced-rail" aria-label="Exam steps">
        {steps.map((item) => (
          <button
            key={item.id}
            type="button"
            className={step === item.id ? "on" : undefined}
            aria-current={step === item.id ? "step" : undefined}
            onClick={() => onChange(item.id)}
          >
            <span className="ced-num">{item.n}</span>
            <span>
              <span className="ced-step-title">
                {item.title}
                {stepErrors[item.id] ? <span className="ced-dot" aria-label="Has errors" /> : null}
              </span>
              <span className="ced-step-hint">{item.hint}</span>
            </span>
          </button>
        ))}
      </nav>
      <div className="ced-rail-h" role="tablist" aria-label="Exam steps">
        {steps.map((item) => (
          <button
            key={item.id}
            type="button"
            className={step === item.id ? "on" : undefined}
            aria-current={step === item.id ? "step" : undefined}
            onClick={() => onChange(item.id)}
          >
            {item.n} {item.title}
            {stepErrors[item.id] ? <span className="ced-dot" /> : null}
          </button>
        ))}
      </div>
    </>
  );
}

export function examStepOrder(mode: "create" | "edit"): ExamEditorStep[] {
  return mode === "edit" ? ["basics", "questions"] : ["basics", "source", "questions"];
}

export const EXAM_STEP_HEADINGS: Record<
  ExamEditorStep,
  { k: string; word: string; sub: string }
> = {
  basics: { k: "Exam", word: "basics", sub: "How students take it, which course, and how long they get." },
  source: { k: "Question", word: "source", sub: "Write questions yourself or pull them from a document." },
  questions: { k: "Exam", word: "questions", sub: "Each item students will see on the paper." },
};

export const EXAM_STEP_FIELDS: Partial<Record<ExamEditorStep, (keyof ExamFormValues)[]>> = {
  basics: ["examType", "title", "description", "courseId", "batchId", "duration", "acceptingResponses"],
  source: ["questionSource", "questionCount"],
};
