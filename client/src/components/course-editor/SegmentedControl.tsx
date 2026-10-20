type SegmentedControlProps = {
  value: string;
  options: string[];
  disabled?: boolean;
  onChange: (value: string) => void;
};

export function SegmentedControl({ value, options, disabled, onChange }: SegmentedControlProps) {
  return (
    <div className="ced-seg" role="radiogroup" aria-label="Difficulty">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={value === option}
          className={value === option ? "on" : undefined}
          disabled={disabled}
          onClick={() => onChange(option)}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
