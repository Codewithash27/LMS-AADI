/**
 * Token-Based Theme Engine — 20 Curated Palette Presets
 * Each preset is a ThemeTokenOverrides object that can be applied via ThemeProvider.
 * Derived from the Color Scheme Gallery (Untitled-4 HTML file).
 */
import type { ThemePreset } from "./types";

export const THEME_PRESETS: ThemePreset[] = [
  {
    name: "Indigo Slate",
    tag: "Corporate & trustworthy",
    tokenOverrides: {
      primary:    { main: "#4F46E5", light: "#818CF8", dark: "#3730A3", contrast: "#ffffff", subtle: "#EEF0FE" },
      secondary:  { main: "#64748B", light: "#94A3B8", dark: "#475569", contrast: "#ffffff" },
      background: { default: "#F7F8FC", paper: "#FFFFFF", subtle: "#EEF0FE", sidebar: "#FFFFFF" },
      border:     { default: "#E5E7EB", radius: "0.625rem" },
      text:       { primary: "#1E1B2E", muted: "#6B7280" },
      typography: { fontFamilyDisplay: "Sora", fontFamilyBody: "Inter" },
    },
  },
  {
    name: "Emerald Fresh",
    tag: "Growth & progress",
    tokenOverrides: {
      primary:    { main: "#0E9F6E", light: "#34D399", dark: "#065F46", contrast: "#ffffff", subtle: "#E5F7EE" },
      secondary:  { main: "#5B7469", light: "#80958E", dark: "#3D5248", contrast: "#ffffff" },
      background: { default: "#F5FBF7", paper: "#FFFFFF", subtle: "#E5F7EE", sidebar: "#FFFFFF" },
      border:     { default: "#DCEEE3", radius: "0.75rem" },
      text:       { primary: "#0F2A20", muted: "#5B7469" },
      typography: { fontFamilyDisplay: "Manrope", fontFamilyBody: "Inter" },
    },
  },
  {
    name: "Sunset Coral",
    tag: "Energetic & youthful",
    tokenOverrides: {
      primary:    { main: "#FF6B4A", light: "#FFA07A", dark: "#D94B2C", contrast: "#ffffff", subtle: "#FFE6DE" },
      secondary:  { main: "#8A6C63", light: "#B89B90", dark: "#6B4A40", contrast: "#ffffff" },
      background: { default: "#FFF8F5", paper: "#FFFFFF", subtle: "#FFE6DE", sidebar: "#FFFFFF" },
      border:     { default: "#FBE0D6", radius: "1rem" },
      text:       { primary: "#3A2620", muted: "#8A6C63" },
      typography: { fontFamilyDisplay: "Poppins", fontFamilyBody: "DM Sans" },
    },
  },
  {
    name: "Ocean Teal",
    tag: "Calm & focused",
    tokenOverrides: {
      primary:    { main: "#0891B2", light: "#38BDF8", dark: "#0E7490", contrast: "#ffffff", subtle: "#E0F5F9" },
      secondary:  { main: "#5A7B80", light: "#8A9EA0", dark: "#3D5860", contrast: "#ffffff" },
      background: { default: "#F3FAFB", paper: "#FFFFFF", subtle: "#E0F5F9", sidebar: "#FFFFFF" },
      border:     { default: "#D7EEF2", radius: "0.625rem" },
      text:       { primary: "#0B2E33", muted: "#5A7B80" },
      typography: { fontFamilyDisplay: "Outfit", fontFamilyBody: "Work Sans" },
    },
  },
  {
    name: "Royal Violet",
    tag: "Premium & confident",
    tokenOverrides: {
      primary:    { main: "#7C3AED", light: "#A78BFA", dark: "#5B21B6", contrast: "#ffffff", subtle: "#F1EAFE" },
      secondary:  { main: "#7A6E8C", light: "#9E95AB", dark: "#5A5068", contrast: "#ffffff" },
      background: { default: "#FAF8FF", paper: "#FFFFFF", subtle: "#F1EAFE", sidebar: "#FFFFFF" },
      border:     { default: "#E9E1FA", radius: "0.875rem" },
      text:       { primary: "#251C3D", muted: "#7A6E8C" },
      typography: { fontFamilyDisplay: "Sora", fontFamilyBody: "Inter" },
    },
  },
  {
    name: "Amber Scholar",
    tag: "Academic & prestigious",
    tokenOverrides: {
      primary:    { main: "#A9700A", light: "#D4920D", dark: "#7A5108", contrast: "#ffffff", subtle: "#FBF0DC" },
      secondary:  { main: "#7A6E5C", light: "#9E9485", dark: "#5A5040", contrast: "#ffffff" },
      background: { default: "#FBF9F4", paper: "#FFFFFF", subtle: "#FBF0DC", sidebar: "#FFFFFF" },
      border:     { default: "#EFE3C9", radius: "0.5rem" },
      text:       { primary: "#2A2118", muted: "#7A6E5C" },
      typography: { fontFamilyDisplay: "Fraunces", fontFamilyBody: "Inter" },
    },
  },
  {
    name: "Forest Sage",
    tag: "Organic & calm",
    tokenOverrides: {
      primary:    { main: "#5B7A5B", light: "#7DA07D", dark: "#3D5A3D", contrast: "#ffffff", subtle: "#E6EDE3" },
      secondary:  { main: "#758268", light: "#9EA992", dark: "#545E47", contrast: "#ffffff" },
      background: { default: "#F6F8F4", paper: "#FFFFFF", subtle: "#E6EDE3", sidebar: "#FFFFFF" },
      border:     { default: "#E1E8DA", radius: "0.75rem" },
      text:       { primary: "#26301F", muted: "#758268" },
      typography: { fontFamilyDisplay: "Epilogue", fontFamilyBody: "Work Sans" },
    },
  },
  {
    name: "Cobalt Sky",
    tag: "Bright & airy",
    tokenOverrides: {
      primary:    { main: "#2563EB", light: "#60A5FA", dark: "#1D4ED8", contrast: "#ffffff", subtle: "#E4EEFF" },
      secondary:  { main: "#5D6C87", light: "#8E9DB5", dark: "#3D4D62", contrast: "#ffffff" },
      background: { default: "#F4F9FF", paper: "#FFFFFF", subtle: "#E4EEFF", sidebar: "#FFFFFF" },
      border:     { default: "#DCE7FA", radius: "0.75rem" },
      text:       { primary: "#132140", muted: "#5D6C87" },
      typography: { fontFamilyDisplay: "Plus Jakarta Sans", fontFamilyBody: "Inter" },
    },
  },
  {
    name: "Rose Quartz",
    tag: "Soft & modern",
    tokenOverrides: {
      primary:    { main: "#DB5A8C", light: "#F472B6", dark: "#BE185D", contrast: "#ffffff", subtle: "#FBE6EE" },
      secondary:  { main: "#8C7078", light: "#B0969D", dark: "#6A5058", contrast: "#ffffff" },
      background: { default: "#FDF6F8", paper: "#FFFFFF", subtle: "#FBE6EE", sidebar: "#FFFFFF" },
      border:     { default: "#F5DEE6", radius: "1rem" },
      text:       { primary: "#3A2530", muted: "#8C7078" },
      typography: { fontFamilyDisplay: "Urbanist", fontFamilyBody: "DM Sans" },
    },
  },
  {
    name: "Crimson Academic",
    tag: "Formal & university",
    tokenOverrides: {
      primary:    { main: "#9E2A2B", light: "#C43B3C", dark: "#7A1E1F", contrast: "#ffffff", subtle: "#F7E4E2" },
      secondary:  { main: "#7D6866", light: "#A08C8A", dark: "#5A4A48", contrast: "#ffffff" },
      background: { default: "#FBF7F5", paper: "#FFFFFF", subtle: "#F7E4E2", sidebar: "#FFFFFF" },
      border:     { default: "#EEDAD6", radius: "0.375rem" },
      text:       { primary: "#2C1414", muted: "#7D6866" },
      typography: { fontFamilyDisplay: "Playfair Display", fontFamilyBody: "Inter" },
    },
  },
  {
    name: "Mint Clarity",
    tag: "Minimal & clean",
    tokenOverrides: {
      primary:    { main: "#0D9488", light: "#2DD4BF", dark: "#0F766E", contrast: "#ffffff", subtle: "#DFF5F1" },
      secondary:  { main: "#65807A", light: "#8CA49F", dark: "#455C56", contrast: "#ffffff" },
      background: { default: "#F6FBF9", paper: "#FFFFFF", subtle: "#DFF5F1", sidebar: "#FFFFFF" },
      border:     { default: "#DBEDE8", radius: "0.625rem" },
      text:       { primary: "#132420", muted: "#65807A" },
      typography: { fontFamilyDisplay: "Manrope", fontFamilyBody: "Manrope" },
    },
  },
  {
    name: "Copper Warmth",
    tag: "Craft & personal",
    tokenOverrides: {
      primary:    { main: "#B5652D", light: "#D97706", dark: "#8B4513", contrast: "#ffffff", subtle: "#F6E6D8" },
      secondary:  { main: "#8A7161", light: "#B09A8A", dark: "#6A5040", contrast: "#ffffff" },
      background: { default: "#FBF7F2", paper: "#FFFFFF", subtle: "#F6E6D8", sidebar: "#FFFFFF" },
      border:     { default: "#EEDECB", radius: "0.875rem" },
      text:       { primary: "#33241A", muted: "#8A7161" },
      typography: { fontFamilyDisplay: "Fraunces", fontFamilyBody: "Work Sans" },
    },
  },
  {
    name: "Midnight Prestige",
    tag: "Navy & gold, serious",
    tokenOverrides: {
      primary:    { main: "#1E3A5F", light: "#2D5A8E", dark: "#122540", contrast: "#ffffff", subtle: "#E6EAF2" },
      secondary:  { main: "#5E6B80", light: "#8894A6", dark: "#3E4A5A", contrast: "#ffffff" },
      background: { default: "#F6F7FB", paper: "#FFFFFF", subtle: "#E6EAF2", sidebar: "#FFFFFF" },
      border:     { default: "#DFE3ED", radius: "0.5rem" },
      text:       { primary: "#141C29", muted: "#5E6B80" },
      typography: { fontFamilyDisplay: "Space Grotesk", fontFamilyBody: "Inter" },
    },
  },
  {
    name: "Lavender Calm",
    tag: "Wellness & soft",
    tokenOverrides: {
      primary:    { main: "#8B7FD6", light: "#A89EE0", dark: "#6A5FC0", contrast: "#ffffff", subtle: "#EDE9FA" },
      secondary:  { main: "#7A758F", light: "#9E99B0", dark: "#5A5470", contrast: "#ffffff" },
      background: { default: "#F8F7FC", paper: "#FFFFFF", subtle: "#EDE9FA", sidebar: "#FFFFFF" },
      border:     { default: "#E6E2F5", radius: "1rem" },
      text:       { primary: "#2B2740", muted: "#7A758F" },
      typography: { fontFamilyDisplay: "Figtree", fontFamilyBody: "DM Sans" },
    },
  },
  {
    name: "Tangerine Pop",
    tag: "Bold & youthful",
    tokenOverrides: {
      primary:    { main: "#F2711F", light: "#FB923C", dark: "#C05000", contrast: "#ffffff", subtle: "#FEE8D6" },
      secondary:  { main: "#8A7458", light: "#B09A80", dark: "#6A5438", contrast: "#ffffff" },
      background: { default: "#FFF9F2", paper: "#FFFFFF", subtle: "#FEE8D6", sidebar: "#FFFFFF" },
      border:     { default: "#FBDFC0", radius: "0.875rem" },
      text:       { primary: "#3A2810", muted: "#8A7458" },
      typography: { fontFamilyDisplay: "Space Grotesk", fontFamilyBody: "Outfit" },
    },
  },
  {
    name: "Steel Graphite",
    tag: "Techy & modern",
    tokenOverrides: {
      primary:    { main: "#3B4859", light: "#5A6B82", dark: "#232D3A", contrast: "#ffffff", subtle: "#E8EAED" },
      secondary:  { main: "#606B78", light: "#8A96A4", dark: "#404B58", contrast: "#ffffff" },
      background: { default: "#F5F6F8", paper: "#FFFFFF", subtle: "#E8EAED", sidebar: "#FFFFFF" },
      border:     { default: "#DFE2E7", radius: "0.5rem" },
      text:       { primary: "#1B222B", muted: "#606B78" },
      typography: { fontFamilyDisplay: "Sora", fontFamilyBody: "Sora" },
    },
  },
  {
    name: "Peach Cream",
    tag: "Friendly & warm",
    tokenOverrides: {
      primary:    { main: "#E08A5B", light: "#F0A87C", dark: "#B86A3A", contrast: "#ffffff", subtle: "#FCE9DC" },
      secondary:  { main: "#8C7669", light: "#B09A8A", dark: "#6A5448", contrast: "#ffffff" },
      background: { default: "#FFF8F3", paper: "#FFFFFF", subtle: "#FCE9DC", sidebar: "#FFFFFF" },
      border:     { default: "#F6E1D0", radius: "1.125rem" },
      text:       { primary: "#3B2A20", muted: "#8C7669" },
      typography: { fontFamilyDisplay: "Poppins", fontFamilyBody: "Figtree" },
    },
  },
  {
    name: "Turquoise Bold",
    tag: "Confident & modern",
    tokenOverrides: {
      primary:    { main: "#0AA6A6", light: "#2DD4BF", dark: "#087A7A", contrast: "#ffffff", subtle: "#DBF5F3" },
      secondary:  { main: "#5C7B7A", light: "#82A09F", dark: "#3C5858", contrast: "#ffffff" },
      background: { default: "#F2FBFB", paper: "#FFFFFF", subtle: "#DBF5F3", sidebar: "#FFFFFF" },
      border:     { default: "#D3EEEC", radius: "0.75rem" },
      text:       { primary: "#0E2B2B", muted: "#5C7B7A" },
      typography: { fontFamilyDisplay: "Outfit", fontFamilyBody: "Inter" },
    },
  },
  {
    name: "Olive Earth",
    tag: "Grounded & sustainable",
    tokenOverrides: {
      primary:    { main: "#6E7B3F", light: "#8EA052", dark: "#4E5828", contrast: "#ffffff", subtle: "#EAEBD9" },
      secondary:  { main: "#82805E", light: "#A8A680", dark: "#60603A", contrast: "#ffffff" },
      background: { default: "#F8F7F1", paper: "#FFFFFF", subtle: "#EAEBD9", sidebar: "#FFFFFF" },
      border:     { default: "#E4E4CC", radius: "0.625rem" },
      text:       { primary: "#2D2B1B", muted: "#82805E" },
      typography: { fontFamilyDisplay: "Epilogue", fontFamilyBody: "Work Sans" },
    },
  },
  {
    name: "Berry Punch",
    tag: "Vibrant & confident",
    tokenOverrides: {
      primary:    { main: "#A8266C", light: "#D4659A", dark: "#801050", contrast: "#ffffff", subtle: "#F6E3EE" },
      secondary:  { main: "#83657A", light: "#A888A0", dark: "#624558", contrast: "#ffffff" },
      background: { default: "#FBF7FB", paper: "#FFFFFF", subtle: "#F6E3EE", sidebar: "#FFFFFF" },
      border:     { default: "#EFDAE7", radius: "0.875rem" },
      text:       { primary: "#301325", muted: "#83657A" },
      typography: { fontFamilyDisplay: "Plus Jakarta Sans", fontFamilyBody: "DM Sans" },
    },
  },
];

/** Default (Paper & Teal) preset — matches the existing LMS base tokens */
export const DEFAULT_PRESET: ThemePreset = {
  name: "Paper & Teal",
  tag: "Default — academic & cool",
  tokenOverrides: {
    primary:    { main: "#0F766E", light: "#14B8A6", dark: "#115E59", contrast: "#ffffff", subtle: "#CCFBF1" },
    secondary:  { main: "#5B7C8D", light: "#7A9AAB", dark: "#3D5A68", contrast: "#ffffff" },
    background: { default: "#F4F8F9", paper: "#FFFFFF", subtle: "#EEF3F5", sidebar: "#E8EEF1" },
    border:     { default: "#D4DEE3", radius: "0.5rem" },
    text:       { primary: "#1E293B", muted: "#64748B" },
    typography: { fontFamilyDisplay: "Inter", fontFamilyBody: "Inter" },
  },
};
