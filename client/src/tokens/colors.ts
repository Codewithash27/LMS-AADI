/**
 * Design Tokens — Color System
 * Paper & Teal theme: cool academic LMS palette.
 * Single source of truth for all UI colors.
 */

export const colorTokens = {
  /** Brand & semantic palette — main/light/dark/contrast for each role */
  primary: {
    main: "#0F766E",
    light: "#14B8A6",
    dark: "#115E59",
    contrast: "#ffffff",
  },
  secondary: {
    main: "#5B7C8D",
    light: "#7A9AAB",
    dark: "#3D5A68",
    contrast: "#ffffff",
  },
  success: {
    main: "#0D9488",
    light: "#2DD4BF",
    dark: "#0F766E",
    contrast: "#ffffff",
  },
  warning: {
    main: "#B45309",
    light: "#D97706",
    dark: "#92400E",
    contrast: "#ffffff",
  },
  error: {
    main: "#B91C1C",
    light: "#DC2626",
    dark: "#991B1B",
    contrast: "#ffffff",
  },
  info: {
    main: "#0E7490",
    light: "#06B6D4",
    dark: "#155E75",
    contrast: "#ffffff",
  },

  /** Semantic UI aliases common in SaaS dashboards */
  semantic: {
    active: "#0D9488",
    inactive: "#64748B",
    pending: "#B45309",
    draft: "#94A3B8",
    rejected: "#B91C1C",
    archived: "#64748B",
  },

  /**
   * Accent scale (replaces preschool rainbow).
   * Keys kept for compatibility with existing imports.
   */
  preschool: {
    coral: {
      main: "#5B7C8D",
      light: "#7A9AAB",
      dark: "#3D5A68",
      contrast: "#ffffff",
    },
    turquoise: {
      main: "#0F766E",
      light: "#14B8A6",
      dark: "#115E59",
      contrast: "#ffffff",
    },
    sunshine: {
      main: "#94A3B8",
      light: "#CBD5E1",
      dark: "#64748B",
      contrast: "#0F172A",
    },
    lavender: {
      main: "#475569",
      light: "#64748B",
      dark: "#334155",
      contrast: "#ffffff",
    },
    peach: {
      main: "#0E7490",
      light: "#22D3EE",
      dark: "#155E75",
      contrast: "#ffffff",
    },
    mint: {
      main: "#0D9488",
      light: "#2DD4BF",
      dark: "#0F766E",
      contrast: "#ffffff",
    },
  },

  /** Cool paper backgrounds */
  background: {
    default: "#F4F8F9",
    paper: "#FFFFFF",
    subtle: "#EEF3F5",
    muted: "#E4EBEE",
  },

  /** SURFACE — cards, panels, overlays */
  surface: {
    card: "#FFFFFF",
    elevated: "#F8FBFC",
    overlay: "rgba(15, 23, 42, 0.45)",
  },

  /** Cool gray borders */
  border: {
    default: "#D4DEE3",
    subtle: "#E8EEF2",
    strong: "#C5D0D6",
    focus: "#0F766E",
  },

  /** SIDEBAR SPECIFIC COLORS */
  sidebar: {
    background: "linear-gradient(180deg, #E8EEF1 0%, #F4F8F9 100%)",
    backgroundSolid: "#E8EEF1",
    hover: "#E2E9ED",
    active: "#DCE8EA",
    border: "#D4DEE3",
    text: {
      primary: "#1E293B",
      secondary: "#64748B",
      muted: "#94A3B8",
    },
  },

  /** MENU ITEM COLORS — teal family, academic */
  menuColors: {
    dashboard: "#0F766E",
    students: "#0E7490",
    academics: "#115E59",
    fees: "#5B7C8D",
    staff: "#0369A1",
    finance: "#0D9488",
    settings: "#64748B",
  },

  /** Text — primary, secondary, disabled, hint, inverse */
  text: {
    primary: "rgba(15, 23, 42, 0.92)",
    secondary: "rgba(15, 23, 42, 0.62)",
    disabled: "rgba(15, 23, 42, 0.38)",
    hint: "rgba(15, 23, 42, 0.38)",
    inverse: "#ffffff",
  },

  /** Divider */
  divider: "rgba(15, 23, 42, 0.10)",

  /** Grayscale scale — cool slate neutrals */
  gray: {
    0: "#ffffff",
    50: "#F8FAFC",
    100: "#F1F5F9",
    200: "#E2E8F0",
    300: "#CBD5E1",
    400: "#94A3B8",
    500: "#64748B",
    600: "#475569",
    700: "#334155",
    800: "#1E293B",
    900: "#0F172A",
    950: "#020617",
  },
} as const;

export type ColorTokens = typeof colorTokens;
