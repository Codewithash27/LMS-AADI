/**
 * Maps design tokens → CSS custom properties for Tailwind / shadcn.
 */
import { colorTokens } from "@/tokens/colors";
import { radiusTokens } from "@/tokens/radius";
import { elevationTokens } from "@/tokens/elevation";

/** Convert #RRGGBB to space-separated HSL channels (no hsl() wrapper) for shadcn. */
export function hexToHslChannels(hex: string): string {
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
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      default:
        h = ((r - g) / d + 4) / 6;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export const cssVariableMap: Record<string, string> = {
  "--background": hexToHslChannels(colorTokens.background.default),
  "--foreground": "222 47% 11%",
  "--card": hexToHslChannels(colorTokens.surface.card),
  "--card-foreground": "222 47% 11%",
  "--popover": hexToHslChannels(colorTokens.surface.card),
  "--popover-foreground": "222 47% 11%",
  "--primary": hexToHslChannels(colorTokens.primary.main),
  "--primary-foreground": "0 0% 100%",
  "--secondary": hexToHslChannels(colorTokens.background.muted),
  "--secondary-foreground": "222 47% 11%",
  "--muted": hexToHslChannels(colorTokens.background.subtle),
  "--muted-foreground": "215 16% 40%",
  "--accent": hexToHslChannels(colorTokens.background.subtle),
  "--accent-foreground": "222 47% 11%",
  "--destructive": hexToHslChannels(colorTokens.error.main),
  "--destructive-foreground": "0 0% 100%",
  "--border": hexToHslChannels(colorTokens.border.default),
  "--input": hexToHslChannels(colorTokens.border.default),
  "--ring": hexToHslChannels(colorTokens.border.focus),
  "--radius": "0.5rem",
  "--radius-card": `${radiusTokens["3xl"]}px`,
  "--sidebar-background": hexToHslChannels(colorTokens.sidebar.backgroundSolid),
  "--sidebar-foreground": "215 25% 27%",
  "--sidebar-primary": hexToHslChannels(colorTokens.primary.main),
  "--sidebar-primary-foreground": "0 0% 100%",
  "--sidebar-accent": hexToHslChannels(colorTokens.background.subtle),
  "--sidebar-accent-foreground": "215 25% 27%",
  "--sidebar-border": hexToHslChannels(colorTokens.border.default),
  "--sidebar-ring": hexToHslChannels(colorTokens.border.focus),
  "--chart-1": hexToHslChannels(colorTokens.primary.main),
  "--chart-2": hexToHslChannels(colorTokens.info.main),
  "--chart-3": hexToHslChannels(colorTokens.secondary.main),
  "--chart-4": hexToHslChannels(colorTokens.preschool.peach.main),
  "--chart-5": hexToHslChannels(colorTokens.preschool.mint.main),
  "--shadow-card": "0 10px 30px rgba(15, 23, 42, 0.04)",
  "--shadow-elevated": elevationTokens[3],
  "--color-brand-blue": colorTokens.info.main,
  "--color-turquoise": colorTokens.primary.main,
  "--color-border-subtle": colorTokens.border.subtle,
  "--color-bg-muted": colorTokens.background.muted,
  "--drawer-width": "280px",
  "--drawer-width-collapsed": "88px",
};
