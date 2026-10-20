import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import type { LoginFormValues } from "@/pages/auth-page";
import { AuthField } from "./AuthField";
import { PasswordField } from "./PasswordField";

type LoginFormProps = {
  form: UseFormReturn<LoginFormValues>;
  showPassword: boolean;
  onShowPassword: (shown: boolean) => void;
  pending: boolean;
  onSubmit: (data: LoginFormValues) => void;
  onCreate: () => void;
};

export function LoginForm({
  form,
  showPassword,
  onShowPassword,
  pending,
  onSubmit,
  onCreate,
}: LoginFormProps) {
  const { register, handleSubmit, formState } = form;
  const username = register("username");
  const password = register("password");

  return (
    <form
      id="auth-panel-login"
      role="tabpanel"
      aria-labelledby="auth-tab-login"
      className="auth-form"
      onSubmit={handleSubmit(onSubmit)}
    >
      <div className="auth-note">
        <Sparkles strokeWidth={2} aria-hidden />
        <p>Students and administrators use the same sign-in. Your role decides what you can access.</p>
      </div>
      <AuthField
        id="login-username"
        label="Username"
        required
        placeholder="Enter your username"
        autoComplete="username"
        error={formState.errors.username?.message}
        {...username}
      />
      <PasswordField
        id="login-password"
        label="Password"
        required
        placeholder="Enter your password"
        shown={showPassword}
        onShownChange={onShowPassword}
        error={formState.errors.password?.message}
        name={password.name}
        onChange={password.onChange}
        onBlur={password.onBlur}
        inputRef={password.ref}
      />
      <button type="submit" className="auth-submit" disabled={pending}>
        {pending ? <Loader2 className="spin" aria-hidden /> : <ArrowRight strokeWidth={2.4} aria-hidden />}
        {pending ? "Signing in..." : "Sign in"}
      </button>
      <p className="auth-switch">
        New here?{" "}
        <button type="button" onClick={onCreate}>
          Create an account
        </button>
      </p>
    </form>
  );
}
