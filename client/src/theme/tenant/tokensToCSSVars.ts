/**
 * Token-Based Theme Engine — CSS Variable Generator
 * Converts ThemeTokenOverrides into shadcn/Tailwind CSS variable map.
 * Applies to :root so every component picks up the new theme instantly.
 */
import type { ThemeTokenOverrides } from "./types";

/** Convert #RRGGBB → "H S% L%" (no hsl() wrapper) for shadcn CSS vars */
export function hexToHslChannels(hex: string): string {
  // Handle rgba or non-hex gracefully
  if (!hex || !hex.startsWith("#")) return hex;
  const cleaned = hex.replace("#", "");
  const full =
    cleaned.length === 3
      ? cleaned
          .split("")
          .map((c) => c + c)
          .join("")
      : cleaned;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      default: h = ((r - g) / d + 4) / 6;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/** Lighten a hex colour toward white by a fraction (0–1) */
function lightenHex(hex: string, fraction: number): string {
  if (!hex || !hex.startsWith("#")) return hex;
  const cleaned = hex.replace("#", "");
  const full = cleaned.length === 3 ? cleaned.split("").map(c => c + c).join("") : cleaned;
  const lerp = (v: number) => Math.min(255, Math.round(v + (255 - v) * fraction));
  const r = lerp(parseInt(full.slice(0, 2), 16));
  const g = lerp(parseInt(full.slice(2, 4), 16));
  const b = lerp(parseInt(full.slice(4, 6), 16));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

/**
 * Converts ThemeTokenOverrides into a CSS variable Record<string, string>.
 * Keys are CSS custom property names; values are ready to inject into :root.
 */
export function tokensToCSSVars(overrides: ThemeTokenOverrides): Record<string, string> {
  const vars: Record<string, string> = {};

  // ── Primary color ──────────────────────────────────────────────────────────
  if (overrides.primary) {
    const p = overrides.primary;
    const subtle = p.subtle ?? lightenHex(p.main, 0.85);
    const light = p.light ?? lightenHex(p.main, 0.4);
    const dark = p.dark ?? p.main;
    vars["--primary"]                   = hexToHslChannels(p.main);
    vars["--primary-foreground"]        = "0 0% 100%";
    vars["--sidebar-primary"]           = hexToHslChannels(p.main);
    vars["--sidebar-primary-foreground"]= "0 0% 100%";
    vars["--sidebar-ring"]              = hexToHslChannels(p.main);
    vars["--ring"]                      = hexToHslChannels(p.main);
    vars["--chart-1"]                   = hexToHslChannels(p.main);
    vars["--brand-mint"]                = hexToHslChannels(light);
    vars["--color-primary-subtle"]      = subtle;
    vars["--color-primary-main"]        = p.main;
    vars["--color-primary-light"]       = light;
    vars["--color-primary-dark"]        = dark;
    vars["--color-turquoise"]           = p.main;
  }

  // ── Secondary color ────────────────────────────────────────────────────────
  if (overrides.secondary) {
    const s = overrides.secondary;
    vars["--chart-2"] = hexToHslChannels(s.main);
    vars["--chart-3"] = hexToHslChannels(s.main);
    vars["--brand-blue"] = hexToHslChannels(s.main);
    vars["--brand-coral"] = hexToHslChannels(s.main);
    vars["--color-secondary-main"] = s.main;
    vars["--color-brand-blue"] = s.main;
  }

  // ── Background / Surface ───────────────────────────────────────────────────
  if (overrides.background) {
    const bg = overrides.background;
    if (bg.default)  vars["--background"]          = hexToHslChannels(bg.default);
    if (bg.paper)    vars["--card"]                = hexToHslChannels(bg.paper);
    if (bg.paper)    vars["--popover"]             = hexToHslChannels(bg.paper);
    if (bg.subtle)   vars["--muted"]               = hexToHslChannels(bg.subtle);
    if (bg.subtle)   vars["--accent"]              = hexToHslChannels(bg.subtle);
    if (bg.subtle)   vars["--secondary"]           = hexToHslChannels(bg.subtle);
    if (bg.sidebar)  vars["--sidebar-background"]  = hexToHslChannels(bg.sidebar);
    if (bg.default)  vars["--color-bg-default"]    = bg.default;
    if (bg.subtle)   vars["--color-bg-subtle"]     = bg.subtle;
    if (bg.subtle)   vars["--color-bg-muted"]      = bg.subtle;
    if (bg.sidebar)  vars["--color-bg-sidebar"]    = bg.sidebar;
  }

  // ── Text colors ────────────────────────────────────────────────────────────
  if (overrides.text) {
    const t = overrides.text;
    if (t.primary) {
      vars["--foreground"] = hexToHslChannels(t.primary);
      vars["--card-foreground"] = hexToHslChannels(t.primary);
      vars["--popover-foreground"] = hexToHslChannels(t.primary);
      vars["--secondary-foreground"] = hexToHslChannels(t.primary);
      vars["--accent-foreground"] = hexToHslChannels(t.primary);
      vars["--sidebar-foreground"] = hexToHslChannels(t.primary);
      vars["--sidebar-accent-foreground"] = hexToHslChannels(t.primary);
      vars["--color-text-primary"] = t.primary;
    }
    if (t.muted) {
      vars["--muted-foreground"] = hexToHslChannels(t.muted);
      vars["--brand-sunshine"] = hexToHslChannels(t.muted);
      vars["--brand-lavender"] = hexToHslChannels(t.muted);
      vars["--color-text-muted"] = t.muted;
    }
  }

  // ── Border & Radius ────────────────────────────────────────────────────────
  if (overrides.border) {
    const b = overrides.border;
    if (b.default) {
      vars["--border"]          = hexToHslChannels(b.default);
      vars["--input"]           = hexToHslChannels(b.default);
      vars["--sidebar-border"]  = hexToHslChannels(b.default);
      vars["--color-border-subtle"] = lightenHex(b.default, 0.35);
    }
    if (b.radius) {
      vars["--radius"]       = b.radius;
      vars["--radius-card"]  = b.radius;
    }
  }

  // ── Typography / Fonts ─────────────────────────────────────────────────────
  if (overrides.typography) {
    const t = overrides.typography;
    if (t.fontFamilyDisplay) vars["--font-display"] = `'${t.fontFamilyDisplay}', sans-serif`;
    if (t.fontFamilyBody)    vars["--font-body"]    = `'${t.fontFamilyBody}', sans-serif`;
  }

  return vars;
}

/**
 * Injects CSS variables directly onto document.documentElement (:root).
 * Call this whenever the active theme changes.
 */
export function applyCSSVarsToRoot(vars: Record<string, string>): void {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
}

/**
 * Removes all theme CSS vars from :root (reset to stylesheet defaults).
 */
export function removeCSSVarsFromRoot(vars: Record<string, string>): void {
  const root = document.documentElement;
  for (const key of Object.keys(vars)) {
    root.style.removeProperty(key);
  }
}

/**
 * Injects Google Fonts <link> for the given font families if not already loaded.
 */
export function injectGoogleFonts(overrides: ThemeTokenOverrides): void {
  const families = new Set<string>();
  if (overrides.typography?.fontFamilyDisplay) families.add(overrides.typography.fontFamilyDisplay);
  if (overrides.typography?.fontFamilyBody)    families.add(overrides.typography.fontFamilyBody);

  families.forEach(family => {
    const id = `gf-${family.replace(/\s+/g, "-").toLowerCase()}`;
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@400;500;600;700&display=swap`;
    document.head.appendChild(link);
  });
}
