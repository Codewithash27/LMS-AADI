type NumberStepperProps = {
  value: number;
  disabled?: boolean;
  onChange: (value: number) => void;
};

export function NumberStepper({ value, disabled, onChange }: NumberStepperProps) {
  const current = Number.isFinite(value) ? value : 1;
  const set = (next: number) => onChange(Math.min(52, Math.max(1, next)));

  return (
    <div className="ced-stepper">
      <button type="button" aria-label="Decrease duration" disabled={disabled || current <= 1} onClick={() => set(current - 1)}>
        −
      </button>
      <input
        type="number"
        min={1}
        max={52}
        value={current}
        disabled={disabled}
        aria-label="Duration in weeks"
        onChange={(event) => set(Number(event.target.value))}
      />
      <span>weeks</span>
      <button type="button" aria-label="Increase duration" disabled={disabled || current >= 52} onClick={() => set(current + 1)}>
        +
      </button>
    </div>
  );
}
