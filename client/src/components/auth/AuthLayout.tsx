import type { ReactNode } from "react";
import { BrandMark, BrandWordmark } from "@/components/brand/BrandMark";
import { BrandPanel } from "./BrandPanel";

type AuthLayoutProps = {
  mode: "login" | "register";
  tabs: ReactNode;
  children: ReactNode;
};

export function AuthLayout({ mode, tabs, children }: AuthLayoutProps) {
  return (
    <div className="auth-shell">
      <main className="auth-main">
        <div className={`auth-col ${mode}`}>
          <div className="auth-logo">
            <BrandMark />
            <BrandWordmark />
          </div>
          <header>
            <h1>
              {mode === "login" ? (
                <>Welcome <i>back</i></>
              ) : (
                <>Create your <i>account</i></>
              )}
            </h1>
            <p>
              {mode === "login"
                ? "Sign in to your account to access courses and exams."
                : "Create a new account to access courses and exams."}
            </p>
          </header>
          {tabs}
          {children}
        </div>
      </main>
      <BrandPanel />
    </div>
  );
}
