import { Eye, EyeOff } from "lucide-react";
import { AuthField } from "./AuthField";

type PasswordFieldProps = {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  shown: boolean;
  onShownChange: (shown: boolean) => void;
  placeholder?: string;
  name?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
  inputRef?: React.Ref<HTMLInputElement>;
};

export function PasswordField({
  id,
  label,
  required,
  error,
  shown,
  onShownChange,
  placeholder,
  name,
  onChange,
  onBlur,
  inputRef,
}: PasswordFieldProps) {
  const errorId = `${id}-error`;
  return (
    <AuthField id={id} label={label} required={required} error={error}>
      <div className="auth-password">
        <input
          id={id}
          name={name}
          ref={inputRef}
          type={shown ? "text" : "password"}
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onChange={onChange}
          onBlur={onBlur}
          autoComplete={id.includes("confirm") ? "new-password" : "current-password"}
        />
        <button
          type="button"
          aria-label={shown ? "Hide password" : "Show password"}
          onClick={() => onShownChange(!shown)}
          onMouseDown={(event) => {
            event.preventDefault();
            onShownChange(true);
          }}
          onMouseUp={() => onShownChange(false)}
          onMouseLeave={() => onShownChange(false)}
        >
          {shown ? <EyeOff strokeWidth={2} aria-hidden /> : <Eye strokeWidth={2} aria-hidden />}
        </button>
      </div>
    </AuthField>
  );
}
