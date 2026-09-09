/**
 * Token-Based Theme Engine — Types
 * ThemeTokenOverrides is the shape stored in DB (tenants.theme_config)
 * and sent via the API. It drives all CSS variable injection.
 */

/** A color role with optional shade variants */
export interface ThemeColorRole {
  main: string;
  light?: string;
  dark?: string;
  contrast?: string;
  /** Subtle tint background (10–20% opacity). If omitted, computed from main. */
  subtle?: string;
}

/** Typography overrides — only provided keys override defaults */
export interface ThemeTypographyOverrides {
  /** Google Font or system font family for display/headings */
  fontFamilyDisplay?: string;
  /** Google Font or system font family for body text */
  fontFamilyBody?: string;
  /** Base font size in px (default: 14) */
  fontSizeBase?: number;
}

/** Background layer overrides */
export interface ThemeBackgroundOverrides {
  /** App background (page background) */
  default?: string;
  /** Card/surface background */
  paper?: string;
  /** Subtle muted background */
  subtle?: string;
  /** Sidebar background solid colour */
  sidebar?: string;
}

/** Border & radius overrides */
export interface ThemeBorderOverrides {
  /** Default border colour */
  default?: string;
  /** Border radius base in rem (default: 0.5rem) */
  radius?: string;
}

/** Text / muted colour overrides (from gallery palettes) */
export interface ThemeTextOverrides {
  /** Primary body / heading text */
  primary?: string;
  /** Secondary / muted labels */
  muted?: string;
}

/**
 * Complete token override shape.
 * Only provided keys override defaults — everything else falls back to the base token set.
 * Stored as JSONB in tenants.theme_config.
 */
export interface ThemeTokenOverrides {
  primary?: ThemeColorRole;
  secondary?: ThemeColorRole;
  background?: ThemeBackgroundOverrides;
  border?: ThemeBorderOverrides;
  text?: ThemeTextOverrides;
  typography?: ThemeTypographyOverrides;
}

/** Named theme preset (from gallery or user-saved) */
export interface ThemePreset {
  id?: number;
  name: string;
  tag: string;
  tokenOverrides: ThemeTokenOverrides;
  isPreset?: boolean;
}
