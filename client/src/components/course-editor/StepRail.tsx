export type EditorStep = "details" | "content" | "thumbnail";

const STEPS: { id: EditorStep; n: string; title: string; hint: string }[] = [
  { id: "details", n: "1", title: "Details", hint: "Title and setup" },
  { id: "content", n: "2", title: "Content", hint: "Modules and lessons" },
  { id: "thumbnail", n: "3", title: "Thumbnail", hint: "Cover image" },
];

type StepRailProps = {
  step: EditorStep;
  errors: Partial<Record<EditorStep, boolean>>;
  onChange: (step: EditorStep) => void;
};

export function StepRail({ step, errors, onChange }: StepRailProps) {
  return (
    <>
      <nav className="ced-rail" aria-label="Course steps">
        {STEPS.map((item) => (
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
                {errors[item.id] ? <span className="ced-dot" aria-label="Has errors" /> : null}
              </span>
              <span className="ced-step-hint">{item.hint}</span>
            </span>
          </button>
        ))}
      </nav>
      <div className="ced-rail-h" role="tablist" aria-label="Course steps">
        {STEPS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={step === item.id ? "on" : undefined}
            aria-current={step === item.id ? "step" : undefined}
            onClick={() => onChange(item.id)}
          >
            {item.n} {item.title}
            {errors[item.id] ? <span className="ced-dot" /> : null}
          </button>
        ))}
      </div>
    </>
  );
}
