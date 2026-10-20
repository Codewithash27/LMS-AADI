import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";

type AuthFieldProps = {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  children?: ReactNode;
} & InputHTMLAttributes<HTMLInputElement>;

export const AuthField = forwardRef<HTMLInputElement, AuthFieldProps>(function AuthField(
  { id, label, required, error, children, ...input },
  ref
) {
  const errorId = `${id}-error`;
  return (
    <div className="auth-field">
      <label htmlFor={id}>
        {label}
        {required ? <span aria-hidden> *</span> : null}
      </label>
      {children ?? (
        <input
          id={id}
          ref={ref}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          {...input}
        />
      )}
      {error ? <p id={errorId}>{error}</p> : null}
    </div>
  );
});
