type AuthTabsProps = {
  value: string;
  onChange: (value: string) => void;
};

export function AuthTabs({ value, onChange }: AuthTabsProps) {
  return (
    <div className="auth-tabs" role="tablist" aria-label="Account">
      <button
        type="button"
        role="tab"
        id="auth-tab-login"
        aria-selected={value === "login"}
        aria-controls="auth-panel-login"
        onClick={() => onChange("login")}
      >
        Login
      </button>
      <button
        type="button"
        role="tab"
        id="auth-tab-register"
        aria-selected={value === "register"}
        aria-controls="auth-panel-register"
        onClick={() => onChange("register")}
      >
        Register
      </button>
    </div>
  );
}
