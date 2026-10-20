const steps = ["Personal information", "Academic details", "Login credentials"];

export function StepBar({ step }: { step: number }) {
  return (
    <ol className="auth-steps" aria-label="Registration progress">
      {steps.map((label, index) => {
        const number = index + 1;
        const state = number < step ? "done" : number === step ? "on" : "";
        return (
          <li key={label} className={state} aria-current={number === step ? "step" : undefined}>
            <span />
            {number} · {label}
          </li>
        );
      })}
    </ol>
  );
}
