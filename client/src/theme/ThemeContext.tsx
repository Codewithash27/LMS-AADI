/**
 * Token-Based Theme Engine — Theme Context
 * Provides active theme state + actions to the entire app.
 * Apply a theme → CSS vars inject instantly, no component changes needed.
 */
import React, { createContext, useContext, useCallback, useState, useRef, useEffect } from "react";
import type { ThemeTokenOverrides } from "./tenant/types";
import { tokensToCSSVars, applyCSSVarsToRoot, removeCSSVarsFromRoot, injectGoogleFonts } from "./tenant/tokensToCSSVars";

// Track which vars are currently applied so we can cleanly reset
let _appliedVarKeys: string[] = [];

export interface ThemeContextValue {
  /** Currently active token overrides (null = default) */
  activeOverrides: ThemeTokenOverrides | null;
  /** Apply a theme immediately (preview — does NOT persist to DB) */
  applyTheme: (overrides: ThemeTokenOverrides) => void;
  /** Reset to base default theme */
  resetTheme: () => void;
  /** Whether a save is in-flight */
  isSaving: boolean;
  /** Save the current overrides to the DB via API (pass null to reset) */
  saveTheme: (overrides?: ThemeTokenOverrides | null) => Promise<void>;
  /** Error from last save attempt */
  saveError: string | null;
  /** Whether current theme differs from DB-persisted theme */
  isDirty: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}

interface ThemeContextProviderProps {
  children: React.ReactNode;
  /** Initial overrides fetched from DB on mount (may be null if default) */
  initialOverrides: ThemeTokenOverrides | null;
}

export function ThemeContextProvider({ children, initialOverrides }: ThemeContextProviderProps) {
  const [activeOverrides, setActiveOverrides] = useState<ThemeTokenOverrides | null>(initialOverrides);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // Keep track of persisted overrides to detect dirty state
  const persistedRef = useRef<ThemeTokenOverrides | null>(initialOverrides);
  const hasUserEditedRef = useRef(false);

  // Sync when ThemeProvider finishes fetching the tenant theme (async mount)
  useEffect(() => {
    if (hasUserEditedRef.current) return;
    persistedRef.current = initialOverrides;
    setActiveOverrides(initialOverrides);
    setIsDirty(false);
    if (initialOverrides && Object.keys(initialOverrides).length > 0) {
      const vars = tokensToCSSVars(initialOverrides);
      applyCSSVarsToRoot(vars);
      _appliedVarKeys = Object.keys(vars);
      injectGoogleFonts(initialOverrides);
    }
  }, [initialOverrides]);

  const applyTheme = useCallback((overrides: ThemeTokenOverrides) => {
    hasUserEditedRef.current = true;
    // Clean up previously applied vars first
    if (_appliedVarKeys.length > 0) {
      const cleanup: Record<string, string> = {};
      _appliedVarKeys.forEach(k => { cleanup[k] = ""; });
      removeCSSVarsFromRoot(cleanup);
    }

    // Generate and apply new vars
    const vars = tokensToCSSVars(overrides);
    applyCSSVarsToRoot(vars);
    _appliedVarKeys = Object.keys(vars);

    // Inject Google Fonts if needed
    injectGoogleFonts(overrides);

    setActiveOverrides(overrides);
    setIsDirty(JSON.stringify(overrides) !== JSON.stringify(persistedRef.current));
    setSaveError(null);
  }, []);

  const resetTheme = useCallback(() => {
    hasUserEditedRef.current = true;
    // Remove all custom CSS vars → fallback to index.css stylesheet defaults
    if (_appliedVarKeys.length > 0) {
      const cleanup: Record<string, string> = {};
      _appliedVarKeys.forEach(k => { cleanup[k] = ""; });
      removeCSSVarsFromRoot(cleanup);
      _appliedVarKeys = [];
    }
    setActiveOverrides(null);
    setIsDirty(persistedRef.current !== null);
    setSaveError(null);
  }, []);

  const saveTheme = useCallback(async (overrides?: ThemeTokenOverrides | null) => {
    const toSave = overrides !== undefined ? overrides : activeOverrides;
    setIsSaving(true);
    setSaveError(null);
    try {
      if (toSave === null) {
        // DELETE = reset to default
        const res = await fetch("/api/theme", { method: "DELETE", credentials: "include" });
        if (!res.ok) throw new Error("Failed to reset theme");
      } else {
        // PUT = save overrides
        const res = await fetch("/api/theme", {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tokenOverrides: toSave }),
        });
        if (!res.ok) throw new Error("Failed to save theme");
      }
      persistedRef.current = toSave;
      hasUserEditedRef.current = false;
      setIsDirty(false);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Unknown error");
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [activeOverrides]);

  return (
    <ThemeContext.Provider value={{ activeOverrides, applyTheme, resetTheme, isSaving, saveTheme, saveError, isDirty }}>
      {children}
    </ThemeContext.Provider>
  );
}
