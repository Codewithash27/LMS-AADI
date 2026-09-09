/**
 * Token-Based Theme Engine — Theme Provider
 * Fetches the tenant's saved theme when the user is authenticated,
 * applies it immediately, and wraps the app in ThemeContextProvider.
 */
import React, { useEffect, useState } from "react";
import { ThemeContextProvider } from "./ThemeContext";
import type { ThemeTokenOverrides } from "./tenant/types";
import { tokensToCSSVars, applyCSSVarsToRoot, injectGoogleFonts } from "./tenant/tokensToCSSVars";
import { useAuth } from "@/hooks/use-auth";

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { user } = useAuth();
  const [initialOverrides, setInitialOverrides] = useState<ThemeTokenOverrides | null>(null);

  useEffect(() => {
    if (!user) {
      setInitialOverrides(null);
      return;
    }

    let cancelled = false;
    fetch("/api/theme", { credentials: "include" })
      .then(async res => {
        if (!res.ok) return null;
        const data = await res.json();
        return data.themeConfig as ThemeTokenOverrides | null;
      })
      .then(overrides => {
        if (cancelled) return;
        if (overrides && Object.keys(overrides).length > 0) {
          const vars = tokensToCSSVars(overrides);
          applyCSSVarsToRoot(vars);
          injectGoogleFonts(overrides);
          setInitialOverrides(overrides);
        } else {
          setInitialOverrides(null);
        }
      })
      .catch(() => {
        if (!cancelled) setInitialOverrides(null);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.tenantId, user?.id]);

  return (
    <ThemeContextProvider initialOverrides={initialOverrides}>
      {children}
    </ThemeContextProvider>
  );
}
