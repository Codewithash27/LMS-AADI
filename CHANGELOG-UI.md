# UI Architecture CHANGELOG

## feat(ui): align LMS shell and tokens with Campus Axis design system

Ported warm preschool tokens, MainLayout/sidebar behavior, and page header patterns while keeping existing LMS features and the Tailwind + shadcn stack.

### Phase 1 — Tokens
- Added `client/src/tokens/` (colors, spacing, radius, elevation, breakpoints, typography) — exact Campus Axis values
- Wired CSS variables in `client/src/index.css` (warm cream backgrounds, turquoise primary `#4ECDC4`, warm borders)
- Extended `tailwind.config.ts` with `brand.*`, `cream.*`, `warm.*`, `rounded-card`, `shadow-card-soft`
- Updated `theme.json` primary to turquoise
- Utilities: `.bg-app-main`, `.bg-accent-brand`, `.bg-sidebar-warm`, `.glass-appbar`, `.shadow-card-soft`

### Phase 2 — Shell
- New `client/src/layout/MainLayout.tsx`: permanent sidebar + sticky glass AppBar + scroll main + sticky footer
- Rebuilt `sidebar.tsx`: 280/88 widths, collapse toggle, nav search, single-open accordion sections, active tint + 6px left border, grayscale inactive icons, gradient header, profile card
- Mobile: temporary drawer only (bottom `MobileNav` removed from shell)
- AppBar: time-based greeting + wave, user chip menu (Profile / Security / Logout)
- `useIsMobile` breakpoint set to **960px** (Campus Axis `md`) for sidebar switch only; Tailwind default `md` (768) unchanged for page grids

### Phase 3 — Page system
- Added `PageLayout` + `PageHeader` (home gradient button + breadcrumbs + actions)
- `Header` kept as compatibility wrapper → PageHeader
- `dashboard-layout.tsx` re-exports MainLayout

### Phase 4 — Primitives
- Restyled shadcn `button`, `card` (24px / warm border / soft shadow), `input`, `dialog`, `badge`
- Added `components/primitives/AppCard.tsx`
- Stat cards and page CTAs moved from blue→purple to turquoise→primary blue (`bg-accent-brand`)

### Explicitly removed from visual language
- Blue→purple brand gradient as primary identity
- Gray/blue/purple page background
- Glass “floating island” content wrapper
- Bottom mobile tab bar in authenticated shell

### Not changed
- LMS API contracts, auth, role guards, Wouter routing, TanStack Query
- Course/exam/batch domain logic
