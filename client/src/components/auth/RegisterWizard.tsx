import { ArrowRight, Loader2 } from "lucide-react";
import type { ChangeEvent, RefObject } from "react";
import { Controller, type UseFormReturn } from "react-hook-form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { RegisterFormValues } from "@/pages/auth-page";
import { AuthField } from "./AuthField";
import { PasswordField } from "./PasswordField";
import { PhotoPicker } from "./PhotoPicker";
import { StepBar } from "./StepBar";

const STEP_FIELDS: Record<number, (keyof RegisterFormValues)[]> = {
  1: ["firstName", "lastName", "email", "mobileNumber", "dateOfBirth"],
  2: ["educationLevel", "schoolCollege", "yearOfStudy"],
  3: ["username", "password", "confirmPassword"],
};

const passwordRules = [
  { label: "8+ characters", test: (value: string) => value.length >= 8 },
  { label: "Uppercase", test: (value: string) => /[A-Z]/.test(value) },
  { label: "Lowercase", test: (value: string) => /[a-z]/.test(value) },
  { label: "Number", test: (value: string) => /\d/.test(value) },
  { label: "Special character", test: (value: string) => /[@$!%*?&]/.test(value) },
];

type RegisterWizardProps = {
  form: UseFormReturn<RegisterFormValues>;
  step: number;
  setStep: (step: number) => void;
  showPassword: boolean;
  onShowPassword: (shown: boolean) => void;
  showConfirm: boolean;
  onShowConfirm: (shown: boolean) => void;
  file: File | null;
  fileInputRef: RefObject<HTMLInputElement>;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  pending: boolean;
  onSubmit: (data: RegisterFormValues) => void;
  onSignIn: () => void;
};

function dateValue(value: Date | undefined) {
  return value instanceof Date && !Number.isNaN(value.getTime()) ? value.toISOString().split("T")[0] : "";
}

export function PersonalStep({ form }: { form: UseFormReturn<RegisterFormValues> }) {
  const { register, control, formState } = form;
  return (
    <div className="auth-grid">
      <AuthField id="register-first-name" label="First name" required placeholder="Enter your first name" error={formState.errors.firstName?.message} {...register("firstName")} />
      <AuthField id="register-last-name" label="Last name" required placeholder="Enter your last name" error={formState.errors.lastName?.message} {...register("lastName")} />
      <AuthField id="register-email" label="Email" required type="email" placeholder="Enter your email address" autoComplete="email" error={formState.errors.email?.message} {...register("email")} />
      <AuthField id="register-mobile" label="Mobile" required type="tel" placeholder="Enter your mobile number" error={formState.errors.mobileNumber?.message} {...register("mobileNumber")} />
      <AuthField id="register-gender" label="Gender">
        <Controller
          name="gender"
          control={control}
          render={({ field }) => (
            <Select value={field.value || undefined} onValueChange={field.onChange}>
              <SelectTrigger id="register-gender" className="auth-select">
                <SelectValue placeholder="Select your gender" />
              </SelectTrigger>
              <SelectContent className="auth-pop">
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
                <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </AuthField>
      <AuthField id="register-dob" label="Date of birth" required error={formState.errors.dateOfBirth?.message as string | undefined}>
        <Controller
          name="dateOfBirth"
          control={control}
          render={({ field }) => (
            <input
              id="register-dob"
              type="date"
              max={new Date().toISOString().split("T")[0]}
              min="1900-01-01"
              aria-invalid={formState.errors.dateOfBirth ? true : undefined}
              aria-describedby={formState.errors.dateOfBirth ? "register-dob-error" : undefined}
              value={dateValue(field.value)}
              onChange={(event) => field.onChange(event.target.value ? new Date(event.target.value) : undefined)}
            />
          )}
        />
      </AuthField>
    </div>
  );
}

export function AcademicStep({ form }: { form: UseFormReturn<RegisterFormValues> }) {
  const { register, control, formState } = form;
  return (
    <div className="auth-stack">
      <AuthField id="register-education" label="Education level" required error={formState.errors.educationLevel?.message as string | undefined}>
        <Controller
          name="educationLevel"
          control={control}
          render={({ field }) => (
            <Select value={field.value || undefined} onValueChange={field.onChange}>
              <SelectTrigger id="register-education" className="auth-select" aria-invalid={formState.errors.educationLevel ? true : undefined} aria-describedby={formState.errors.educationLevel ? "register-education-error" : undefined}>
                <SelectValue placeholder="Select your education level" />
              </SelectTrigger>
              <SelectContent className="auth-pop">
                <SelectItem value="10th">10th</SelectItem>
                <SelectItem value="12th">12th</SelectItem>
                <SelectItem value="Diploma">Diploma</SelectItem>
                <SelectItem value="Graduate">Graduate</SelectItem>
                <SelectItem value="Postgraduate">Postgraduate</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </AuthField>
      <AuthField id="register-school" label="School/College name" required placeholder="Enter your school or college name" error={formState.errors.schoolCollege?.message} {...register("schoolCollege")} />
      <AuthField id="register-year" label="Year of study" required error={formState.errors.yearOfStudy?.message as string | undefined}>
        <Controller
          name="yearOfStudy"
          control={control}
          render={({ field }) => (
            <Select value={field.value || undefined} onValueChange={field.onChange}>
              <SelectTrigger id="register-year" className="auth-select" aria-invalid={formState.errors.yearOfStudy ? true : undefined} aria-describedby={formState.errors.yearOfStudy ? "register-year-error" : undefined}>
                <SelectValue placeholder="Select your year of study" />
              </SelectTrigger>
              <SelectContent className="auth-pop">
                <SelectItem value="1st Year">1st Year</SelectItem>
                <SelectItem value="2nd Year">2nd Year</SelectItem>
                <SelectItem value="3rd Year">3rd Year</SelectItem>
                <SelectItem value="4th Year">4th Year</SelectItem>
                <SelectItem value="Final Year">Final Year</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </AuthField>
    </div>
  );
}

export function CredentialsStep({
  form,
  showPassword,
  onShowPassword,
  showConfirm,
  onShowConfirm,
}: {
  form: UseFormReturn<RegisterFormValues>;
  showPassword: boolean;
  onShowPassword: (shown: boolean) => void;
  showConfirm: boolean;
  onShowConfirm: (shown: boolean) => void;
}) {
  const { register, formState, watch } = form;
  const username = register("username");
  const password = register("password");
  const confirm = register("confirmPassword");
  const passwordValue = watch("password") || "";

  return (
    <div className="auth-stack">
      <AuthField id="register-username" label="Username" required placeholder="Choose a username" autoComplete="username" error={formState.errors.username?.message} {...username} />
      <PasswordField
        id="register-password"
        label="Password"
        required
        placeholder="Choose a password"
        shown={showPassword}
        onShownChange={onShowPassword}
        error={formState.errors.password?.message}
        name={password.name}
        onChange={password.onChange}
        onBlur={password.onBlur}
        inputRef={password.ref}
      />
      <ul className="auth-rules" aria-label="Password requirements">
        {passwordRules.map((rule) => (
          <li key={rule.label} className={rule.test(passwordValue) ? "ok" : undefined}>
            {rule.label}
          </li>
        ))}
      </ul>
      <PasswordField
        id="register-confirm-password"
        label="Confirm password"
        required
        placeholder="Confirm your password"
        shown={showConfirm}
        onShownChange={onShowConfirm}
        error={formState.errors.confirmPassword?.message}
        name={confirm.name}
        onChange={confirm.onChange}
        onBlur={confirm.onBlur}
        inputRef={confirm.ref}
      />
    </div>
  );
}

export function RegisterWizard({
  form,
  step,
  setStep,
  showPassword,
  onShowPassword,
  showConfirm,
  onShowConfirm,
  file,
  fileInputRef,
  onFileChange,
  pending,
  onSubmit,
  onSignIn,
}: RegisterWizardProps) {
  const goNext = async () => {
    const valid = await form.trigger(STEP_FIELDS[step]);
    if (valid) setStep(Math.min(3, step + 1));
  };

  const onInvalid = (errors: Partial<Record<keyof RegisterFormValues, unknown>>) => {
    if (STEP_FIELDS[1].some((field) => errors[field])) setStep(1);
    else if (STEP_FIELDS[2].some((field) => errors[field])) setStep(2);
    else setStep(3);
  };

  return (
    <form
      id="auth-panel-register"
      role="tabpanel"
      aria-labelledby="auth-tab-register"
      className="auth-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (step < 3) {
          void goNext();
          return;
        }
        void form.handleSubmit(onSubmit, onInvalid)(event);
      }}
    >
      <StepBar step={step} />
      {step === 1 ? (
        <>
          <PersonalStep form={form} />
          <PhotoPicker inputRef={fileInputRef} file={file} onChange={onFileChange} />
        </>
      ) : null}
      {step === 2 ? <AcademicStep form={form} /> : null}
      {step === 3 ? (
        <CredentialsStep
          form={form}
          showPassword={showPassword}
          onShowPassword={onShowPassword}
          showConfirm={showConfirm}
          onShowConfirm={onShowConfirm}
        />
      ) : null}
      <input type="hidden" {...form.register("tenantId", { valueAsNumber: true })} value={1} />
      <div className="auth-actions">
        {step > 1 ? (
          <button type="button" className="auth-back" onClick={() => setStep(step - 1)}>
            Back
          </button>
        ) : null}
        {step < 3 ? (
          <button type="button" className="auth-submit" onClick={() => void goNext()}>
            Continue
            <ArrowRight strokeWidth={2.4} aria-hidden />
          </button>
        ) : (
          <button type="submit" className="auth-submit" disabled={pending}>
            {pending ? <Loader2 className="spin" aria-hidden /> : <ArrowRight strokeWidth={2.4} aria-hidden />}
            {pending ? "Creating account..." : "Create account"}
          </button>
        )}
      </div>
      <p className="auth-switch">
        Already have an account?{" "}
        <button type="button" onClick={onSignIn}>
          Sign in
        </button>
      </p>
    </form>
  );
}
