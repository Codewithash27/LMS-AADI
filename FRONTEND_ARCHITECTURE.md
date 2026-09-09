# FRONTEND_ARCHITECTURE.md

**Complete Frontend Documentation for Edu Transform LMS**  
*Use this to replicate the exact theme, color scheme, component patterns, and UI architecture in another project.*

---

## 1. DESIGN SYSTEM OVERVIEW

### 1.1 Visual Identity

| Property | Value |
|----------|-------|
| **Primary Brand Colors** | Blue → Purple gradient (`from-blue-500 to-purple-600`) |
| **Background** | Subtle gradient: `from-gray-50 via-blue-50/30 to-purple-50/20` |
| **Card/Container** | Glassmorphism: `bg-white/70 backdrop-blur-md border border-white/20 shadow-2xl` |
| **Typography** | System fonts (Inter/sans-serif via Tailwind defaults) |
| **Border Radius** | Consistent `rounded-xl` / `rounded-2xl` / `rounded-3xl` |
| **Shadows** | Layered: `shadow-sm` → `shadow-lg` → `shadow-2xl` |
| **Animations** | Framer Motion spring transitions (stiffness: 320, damping: 32) |

### 1.2 Color Palette (CSS Variables via Tailwind)

Defined in `tailwind.config.ts` — all colors use HSL CSS variables for dark mode support:

```css
/* Light mode defaults (from shadcn/ui) */
--background: 0 0% 100%;
--foreground: 222.2 84% 4.9%;
--card: 0 0% 100%;
--card-foreground: 222.2 84% 4.9%;
--primary: 221.2 83.2% 53.3%;        /* Blue-600 */
--primary-foreground: 210 40% 98%;
--secondary: 210 40% 96.1%;
--secondary-foreground: 222.2 47.4% 11.2%;
--muted: 210 40% 96.1%;
--muted-foreground: 215.4 16.3% 46.9%;
--accent: 210 40% 96.1%;
--accent-foreground: 222.2 47.4% 11.2%;
--destructive: 0 84.2% 60.2%;
--destructive-foreground: 210 40% 98%;
--border: 214.3 31.8% 91.4%;
--input: 214.3 31.8% 91.4%;
--ring: 221.2 83.2% 53.3%;
--radius: 0.5rem;

/* Sidebar-specific colors */
--sidebar-background: 0 0% 98%;
--sidebar-foreground: 240 5.3% 26.1%;
--sidebar-primary: 224.3 76.3% 48%;
--sidebar-primary-foreground: 0 0% 100%;
--sidebar-accent: 240 4.8% 95.9%;
--sidebar-accent-foreground: 240 5.9% 10%;
--sidebar-border: 220 13% 91%;
--sidebar-ring: 217.2 91.2% 59.8%;
```

### 1.3 Custom Brand Colors (Used in Components)

```css
/* Gradient brand colors used throughout */
from-blue-500 to-purple-600       /* Primary brand gradient */
from-blue-500/20 to-purple-600/20 /* Subtle backgrounds */
bg-blue-50 text-blue-700          /* Active nav state */
bg-blue-500/10                    /* Hover accents */

/* Neutral grays for text hierarchy */
text-gray-900     /* Primary headings */
text-gray-600     /* Secondary text */
text-gray-500     /* Muted/placeholder */
text-gray-400     /* Disabled/tertiary */
```

---

## 2. TECH STACK & ARCHITECTURE

### 2.1 Core Dependencies

| Category | Packages |
|----------|----------|
| **Framework** | React 18, TypeScript, Vite |
| **Routing** | Wouter (lightweight, ~1.5KB) |
| **State/Data** | TanStack Query v5 (server state), React Context (client state) |
| **Styling** | Tailwind CSS v3, class-variance-authority (CVA), clsx, tailwind-merge |
| **UI Primitives** | Radix UI (40+ components) |
| **Icons** | Lucide React |
| **Animation** | Framer Motion |
| **Forms** | React Hook Form + Zod resolvers |
| **Charts** | Recharts |
| **Markdown** | React Markdown + rehype-highlight |

### 2.2 Path Aliases (vite.config.ts)

```typescript
"@": "client/src",
"@shared": "shared",
"@assets": "attached_assets"
```

Usage: `import { Button } from "@/components/ui/button"`

---

## 3. PROJECT STRUCTURE

```
client/src/
├── components/
│   ├── ui/                    # 40+ shadcn/ui base components
│   │   ├── button.tsx         # CVA variants: default, destructive, outline, secondary, ghost, link
│   │   ├── card.tsx           # Card, CardHeader, CardTitle, CardContent, CardFooter
│   │   ├── sidebar.tsx        # Complete sidebar system (collapsible, mobile drawer, tooltips)
│   │   ├── input.tsx          # Base input with focus rings
│   │   ├── form.tsx           # RHF + Zod integration
│   │   ├── table.tsx          # Data table with sorting/pagination
│   │   ├── dialog.tsx         # Modal dialogs
│   │   ├── dropdown-menu.tsx  # Context menus
│   │   ├── toast.tsx          # Toast notifications
│   │   ├── avatar.tsx         # User avatars with fallback
│   │   ├── badge.tsx          # Status badges
│   │   ├── tabs.tsx           # Tab navigation
│   │   ├── select.tsx         # Select combobox
│   │   ├── checkbox.tsx       # Checkbox with label
│   │   ├── radio-group.tsx    # Radio buttons
│   │   ├── switch.tsx         # Toggle switches
│   │   ├── slider.tsx         # Range sliders
│   │   ├── progress.tsx       # Progress bars
│   │   ├── skeleton.tsx       # Loading placeholders
│   │   ├── tooltip.tsx        # Tooltips
│   │   ├── popover.tsx        # Popovers
│   │   ├── hover-card.tsx     # Hover cards
│   │   ├── alert.tsx          # Alert banners
│   │   ├── alert-dialog.tsx   # Confirmation dialogs
│   │   ├── sheet.tsx          # Side sheets (mobile drawers)
│   │   ├── drawer.tsx         # Drawers
│   │   ├── navigation-menu.tsx# Top navigation
│   │   ├── pagination.tsx     # Pagination controls
│   │   ├── breadcrumb.tsx     # Breadcrumbs
│   │   ├── calendar.tsx       # Date picker
│   │   ├── command.tsx        # Command palette
│   │   ├── context-menu.tsx   # Right-click menus
│   │   ├── menubar.tsx        # Menu bars
│   │   ├── resizable.tsx      # Resizable panels
│   │   ├── scroll-area.tsx    # Custom scrollbars
│   │   ├── separator.tsx      # Dividers
│   │   ├── toggle.tsx         # Toggle buttons
│   │   ├── toggle-group.tsx   # Toggle groups
│   │   ├── accordion.tsx      # Accordions
│   │   ├── collapsible.tsx    # Collapsible sections
│   │   ├── carousel.tsx       # Carousels
│   │   ├── aspect-ratio.tsx   # Aspect ratio boxes
│   │   ├── chart.tsx          # Recharts wrapper
│   │   └── input-otp.tsx      # OTP inputs
│   ├── layout/
│   │   ├── sidebar.tsx        # App-specific sidebar with nav links
│   │   ├── header.tsx         # Page headers with search, notifications, user menu
│   │   ├── dashboard-layout.tsx # Main layout wrapper (sidebar + main + mobile nav)
│   │   ├── mobile-nav.tsx     # Bottom mobile navigation
│   │   └── sidebar-toggle.tsx # Sidebar collapse button
│   ├── auth/
│   │   ├── logout-overlay.tsx # Full-screen logout animation
│   │   └── logout-provider.tsx# Logout context
│   ├── courses/
│   │   ├── video-component.tsx# Video player with progress
│   │   └── quiz-component.tsx # Interactive quiz UI
│   ├── dashboard/
│   │   ├── stat-card.tsx      # Metric cards with icons/trends
│   │   ├── activity-chart.tsx # Recharts line/bar charts
│   │   ├── performance-metrics.tsx
│   │   ├── recent-activities.tsx
│   │   └── upcoming-exams.tsx
│   ├── exams/
│   │   ├── exam-editor.tsx    # Rich text exam builder
│   │   └── exam-view.tsx      # Student exam taking UI
│   └── ai/
│       ├── chat-interface.tsx # AI chat with streaming
│       └── image-upload.tsx   # Drag-drop image upload
├── hooks/
│   ├── use-auth.tsx           # Auth state, user, login/logout mutations
│   ├── use-sidebar.tsx        # Sidebar state (open/collapsed, mobile)
│   ├── use-mobile.tsx         # Mobile breakpoint detection
│   └── use-toast.ts           # Toast notifications
├── lib/
│   ├── queryClient.ts         # TanStack Query config
│   ├── protected-route.tsx    # Role-based route guard
│   └── utils.ts               # cn() helper (clsx + tailwind-merge)
├── pages/
│   ├── admin/                 # 10 admin pages
│   │   ├── dashboard.tsx
│   │   ├── courses.tsx
│   │   ├── course-progress.tsx
│   │   ├── exams.tsx
│   │   ├── students.tsx
│   │   ├── student-details.tsx
│   │   ├── batches.tsx
│   │   ├── batch-details.tsx
│   │   ├── reports.tsx
│   │   ├── grading.tsx
│   │   └── profile.tsx
│   └── student/               # 7 student pages
│       ├── dashboard.tsx
│       ├── my-courses.tsx
│       ├── course-details.tsx
│       ├── upcoming-exams.tsx
│       ├── results.tsx
│       ├── profile.tsx
│       └── ai-assistant.tsx
├── App.tsx                    # Route definitions + providers
├── main.tsx                   # Entry point
└── index.css                  # Global styles + Tailwind imports
```

---

## 4. COMPONENT PATTERNS & CONVENTIONS

### 4.1 Component Structure (shadcn/ui Style)

Every UI component follows this pattern:

```typescript
// 1. Import dependencies
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

// 2. Define variants with CVA
const buttonVariants = cva(
  "base-classes...",
  {
    variants: {
      variant: { default: "...", outline: "...", ghost: "..." },
      size: { default: "h-10 px-4", sm: "h-9 px-3", lg: "h-11 px-8" }
    },
    defaultVariants: { variant: "default", size: "default" }
  }
)

// 3. Extend HTML attributes + variant props
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

// 4. Forward ref + render
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"
export { Button, buttonVariants }
```

### 4.2 Utility: `cn()` Helper

```typescript
// client/src/lib/utils.ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

**Usage**: `className={cn("base-classes", condition && "conditional", className)}`

### 4.3 Composition Pattern: Compound Components

Components like `Card`, `Sidebar`, `Form` export multiple related components:

```typescript
export { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription }
export { Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarMenu, ... }
```

---

## 5. LAYOUT SYSTEM

### 5.1 Dashboard Layout (`dashboard-layout.tsx`)

```tsx
<div className="relative min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20">
  <Sidebar />
  
  <main className={cn(
    "min-h-screen transition-all duration-500 ease-in-out",
    isMobile
      ? "ml-0 px-3 pt-3 pb-24"
      : cn(sidebarOpen ? "ml-80" : "ml-20", "p-4")
  )}>
    <div className="rounded-3xl bg-white/70 backdrop-blur-md border border-white/20 shadow-2xl min-h-[calc(100vh-2rem)]">
      <div className="p-4 sm:p-6 lg:p-8">
        {children}
      </div>
    </div>
  </main>
  
  <MobileNav />
</div>
```

**Key behaviors**:
- Desktop: Fixed sidebar (20px collapsed, 80px expanded) with main content offset
- Mobile: Sidebar becomes drawer, main content full-width with bottom nav
- Smooth 500ms transitions on sidebar toggle

### 5.2 Sidebar System (`components/ui/sidebar.tsx`)

**Features**:
- Three variants: `sidebar` (default), `floating`, `inset`
- Collapsible modes: `offcanvas` (hidden), `icon` (icon-only), `none`
- Persistent state via cookie (`sidebar:state`, 7 days)
- Keyboard shortcut: `Ctrl/Cmd + B`
- Tooltip labels when collapsed
- Mobile: Sheet-based drawer with spring animation

**CSS Variables for Width**:
```css
--sidebar-width: 16rem;        /* 256px expanded */
--sidebar-width-icon: 3rem;    /* 48px icon-only */
--sidebar-width-mobile: 18rem; /* 288px mobile drawer */
```

### 5.3 Page Header (`components/layout/header.tsx`)

```tsx
<motion.header className="mb-8" initial={{opacity:0, y:-20}} animate={{opacity:1, y:0}}>
  <div className="flex justify-between items-center">
    <div className="flex items-center space-x-4">
      <SidebarToggle />
      <div>
        <motion.h1 className="text-3xl font-bold bg-gradient-to-br from-gray-900 to-gray-700 bg-clip-text text-transparent">
          {title}
        </motion.h1>
        <motion.p className="text-gray-600 mt-1">{subtitle}</motion.p>
      </div>
    </div>
    
    <div className="flex items-center space-x-3">
      {/* Search (md+) */}
      <div className="relative hidden md:block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input className="pl-10 pr-4 py-2 bg-white/70 backdrop-blur-sm border border-white/20 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/20 w-64" />
      </div>
      
      {/* Notification Bell */}
      <motion.button className="p-3 bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 hover:shadow-xl hover:scale-105 whileHover={{scale:1.05}}">
        <Bell className="h-5 w-5 text-gray-600 group-hover:text-blue-600" />
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
      </motion.button>
      
      {/* Settings */}
      <motion.button className="p-3 bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 hover:rotate-15 whileHover={{scale:1.05, rotate:15}}">
        <Settings className="h-5 w-5 text-gray-600 group-hover:text-blue-600" />
      </motion.button>
      
      {/* User Avatar */}
      <div className="flex items-center space-x-3 p-2 bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
          {initials}
        </div>
        <div className="hidden md:block">
          <p className="text-sm font-semibold text-gray-900">{name}</p>
          <p className="text-xs text-gray-500 capitalize">{role}</p>
        </div>
      </div>
    </div>
  </div>
</motion.header>
```

---

## 6. THEMING & CUSTOMIZATION GUIDE

### 6.1 Changing the Brand Color

**Option A: Tailwind Config (Recommended)**

Edit `tailwind.config.ts` — update the primary HSL value:

```typescript
theme: {
  extend: {
    colors: {
      primary: {
        DEFAULT: "hsl(var(--primary))",        // Change this HSL
        foreground: "hsl(var(--primary-foreground))",
      },
      // Also update sidebar primary if needed
      sidebar: {
        primary: "hsl(var(--sidebar-primary))",
        "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
      }
    }
  }
}
```

Then update CSS variables in `client/src/index.css` (or via Tailwind's `@theme`):

```css
@layer base {
  :root {
    --primary: 221.2 83.2% 53.3%;        /* Your new primary hue */
    --primary-foreground: 210 40% 98%;
    --sidebar-primary: 221.2 83.2% 53.3%;
    --sidebar-primary-foreground: 0 0% 100%;
  }
}
```

**Option B: Direct Component Override**

Search/replace gradient classes:
- `from-blue-500 to-purple-600` → `from-your-500 to-your-600`
- `bg-blue-50 text-blue-700` → `bg-your-50 text-your-700`
- `focus:ring-blue-500` → `focus:ring-your-500`

### 6.2 Dark Mode

Already configured via `darkMode: ["class"]` in `tailwind.config.ts`.

To enable: Add `class="dark"` to `<html>` or use a toggle that adds/removes the class.

CSS variables automatically switch (defined in shadcn/ui defaults).

### 6.3 Border Radius Scale

```typescript
// tailwind.config.ts
borderRadius: {
  lg: "var(--radius)",           // 0.5rem (8px) - cards, buttons
  md: "calc(var(--radius) - 2px)", // 6px - inputs
  sm: "calc(var(--radius) - 4px)", // 4px - badges, small elements
  xl: "calc(var(--radius) + 4px)", // 12px - modals, sheets
  "2xl": "calc(var(--radius) + 8px)", // 16px - large cards
  "3xl": "calc(var(--radius) + 16px)", // 24px - page containers
}
```

### 6.4 Font Customization

Current: System fonts via Tailwind defaults (`font-sans`)

To add custom font (e.g., Inter, Plus Jakarta Sans):

1. Add to `client/index.html`:
```html
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
```

2. Update `tailwind.config.ts`:
```typescript
fontFamily: {
  sans: ["Plus Jakarta Sans", "system-ui", "sans-serif"],
  heading: ["Plus Jakarta Sans", "system-ui", "sans-serif"],
}
```

3. Use in components: `className="font-heading"` or `font-sans`

---

## 7. KEY UI COMPONENTS REFERENCE

### 7.1 Button Variants

```tsx
<Button variant="default" size="default">Primary Action</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="destructive">Delete</Button>
<Button variant="link">Link</Button>

<Button size="sm">Small</Button>
<Button size="lg">Large</Button>
<Button size="icon"><Icon /></Button>
<Button asChild><a href="/">Link as Button</a></Button>
```

### 7.2 Card System

```tsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>Content</CardContent>
  <CardFooter>Actions</CardFooter>
</Card>
```

### 7.3 Form Pattern (React Hook Form + Zod)

```tsx
const schema = z.object({ email: z.string().email(), name: z.string().min(2) })

<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)}>
    <FormField
      control={form.control}
      name="email"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Email</FormLabel>
          <FormControl><Input placeholder="email@example.com" {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <Button type="submit">Submit</Button>
  </form>
</Form>
```

### 7.4 Data Table

```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Role</TableHead>
      <TableHead className="text-right">Actions</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {data.map(item => (
      <TableRow key={item.id}>
        <TableCell>{item.name}</TableCell>
        <TableCell><Badge variant="secondary">{item.role}</Badge></TableCell>
        <TableCell className="text-right">
          <Button variant="ghost" size="sm">Edit</Button>
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

### 7.5 Stat Card (Dashboard)

```tsx
<Card className="bg-white/70 backdrop-blur-sm border-white/20 shadow-xl">
  <CardContent className="p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500">Total Students</p>
        <p className="text-3xl font-bold text-gray-900 mt-1">1,234</p>
        <p className="text-xs text-green-600 flex items-center gap-1 mt-2">
          <TrendingUp className="h-3 w-3" /> +12% vs last month
        </p>
      </div>
      <div className="p-3 rounded-2xl bg-blue-100 text-blue-600">
        <Users className="h-6 w-6" />
      </div>
    </div>
  </CardContent>
</Card>
```

### 7.6 Toast Notifications

```tsx
// In component
const { toast } = useToast()

toast({
  title: "Success",
  description: "Course created successfully",
  variant: "default", // or "destructive"
})

// Toaster provider in App.tsx
<Toaster />
```

---

## 8. ANIMATION PATTERNS

### 8.1 Framer Motion Page Transitions

```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5 }}
>
  <motion.h1
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: 0.1 }}
  >
    Title
  </motion.h1>
</motion.div>
```

### 8.2 Sidebar Animations

- **Desktop collapse**: CSS `transition-[width] duration-200 ease-linear`
- **Mobile drawer**: Spring `stiffness: 320, damping: 32`
- **Backdrop**: Fade `opacity: 0 → 1`

### 8.3 Hover/Tap Feedback (Buttons, Cards)

```tsx
<motion.button
  whileHover={{ scale: 1.02, y: -2 }}
  whileTap={{ scale: 0.98 }}
  className="transition-all duration-300"
>
```

---

## 9. RESPONSIVE BREAKPOINTS

```css
/* Tailwind defaults */
sm:  640px   /* Mobile landscape */
md:  768px   /* Tablet */
lg:  1024px  /* Desktop */
xl:  1280px  /* Large desktop */
2xl: 1536px  /* Extra large */
```

**Sidebar behavior**:
- `< md` (768px): Mobile drawer + bottom nav
- `≥ md`: Fixed sidebar with collapse toggle

**Header search**: Hidden on mobile (`hidden md:block`)

---

## 10. STATE MANAGEMENT

### 10.1 Server State: TanStack Query

```typescript
// client/src/lib/queryClient.ts
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 min
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})
```

Usage:
```tsx
const { data, isLoading, error } = useQuery({
  queryKey: ['courses'],
  queryFn: () => api.getCourses(),
})
```

### 10.2 Client State: React Context

- **Auth**: `AuthProvider` → `useAuth()` (user, login, logout, register)
- **Sidebar**: `SidebarProvider` → `useSidebar()` (open, collapsed, mobile)
- **Mobile**: `useIsMobile()` (media query hook)

### 10.3 Form State: React Hook Form

```tsx
const form = useForm<Schema>({
  resolver: zodResolver(schema),
  defaultValues: { ... }
})
```

---

## 11. ACCESSIBILITY (a11y)

Built on Radix UI primitives — includes:
- ✅ Keyboard navigation (Tab, Arrow keys, Escape)
- ✅ Focus management (focus-visible rings)
- ✅ ARIA attributes (roles, labels, states)
- ✅ Screen reader support (sr-only labels)
- ✅ Color contrast (WCAG AA compliant)
- ✅ Reduced motion respect (`prefers-reduced-motion`)

---

## 12. FILES TO COPY FOR REPLICATION

### Essential Config Files
```
├── tailwind.config.ts          # Theme, colors, fonts, radius
├── vite.config.ts              # Path aliases, plugins
├── tsconfig.json               # TypeScript config
├── package.json                # Dependencies
├── client/src/index.css        # Global styles, CSS variables
└── client/src/lib/utils.ts     # cn() helper
```

### Core UI Components (copy entire `ui/` folder)
```
client/src/components/ui/
├── button.tsx
├── card.tsx
├── input.tsx
├── sidebar.tsx
├── form.tsx
├── table.tsx
├── dialog.tsx
├── dropdown-menu.tsx
├── toast.tsx + toaster.tsx
├── avatar.tsx
├── badge.tsx
├── tabs.tsx
├── select.tsx
├── tooltip.tsx
├── sheet.tsx
├── skeleton.tsx
└── ... (40+ components)
```

### Layout System
```
client/src/components/layout/
├── sidebar.tsx         # App nav sidebar
├── header.tsx          # Page header
├── dashboard-layout.tsx# Main layout wrapper
├── mobile-nav.tsx      # Bottom mobile nav
└── sidebar-toggle.tsx  # Collapse button
```

### Hooks
```
client/src/hooks/
├── use-auth.tsx
├── use-sidebar.tsx
├── use-mobile.tsx
└── use-toast.ts
```

### Providers & App Setup
```
client/src/
├── App.tsx             # Routes + providers
├── main.tsx            # Entry
├── lib/
│   ├── queryClient.ts
│   └── protected-route.tsx
```

---

## 13. STEP-BY-STEP REPLICATION CHECKLIST

### Phase 1: Foundation
- [ ] Copy `package.json` dependencies
- [ ] Copy `tailwind.config.ts` (adjust colors if needed)
- [ ] Copy `vite.config.ts` (update aliases)
- [ ] Copy `tsconfig.json`
- [ ] Copy `client/src/index.css`
- [ ] Copy `client/src/lib/utils.ts`

### Phase 2: UI Components
- [ ] Copy entire `client/src/components/ui/` folder
- [ ] Verify all imports resolve (check `@/lib/utils`)

### Phase 3: Layout System
- [ ] Copy `client/src/components/layout/`
- [ ] Copy `client/src/hooks/` (use-sidebar, use-mobile, use-auth)
- [ ] Copy `client/src/lib/queryClient.ts`, `protected-route.tsx`

### Phase 4: App Structure
- [ ] Copy `client/src/App.tsx` (adjust routes)
- [ ] Copy `client/src/main.tsx`
- [ ] Create your pages using the component patterns

### Phase 5: Customization
- [ ] Update brand colors in `tailwind.config.ts` + `index.css`
- [ ] Update fonts if desired
- [ ] Adjust border radius scale
- [ ] Replace logo/branding in `Sidebar` component

---

## 14. COMMON GOTCHAS

| Issue | Solution |
|-------|----------|
| `cn()` not found | Ensure `client/src/lib/utils.ts` exists and `@` alias works |
| Radix components unstyled | Check `tailwind.config.ts` `content` paths include all component files |
| Dark mode not working | Add `class="dark"` to `<html>` or toggle via JS |
| Sidebar width broken | Verify CSS variables `--sidebar-width` are set in `SidebarProvider` |
| Animations lag | Reduce Framer Motion complexity, use `transform`/`opacity` only |
| Build fails on types | Run `npm run check` (tsc --noEmit) to diagnose |

---

## 15. DESIGN TOKENS QUICK REFERENCE

```css
/* Spacing (Tailwind defaults) */
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */

/* Shadows */
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
--shadow-2xl: 0 25px 50px -12px rgb(0 0 0 / 0.25);

/* Transitions */
--transition-fast: 150ms ease;
--transition-base: 200ms ease;
--transition-slow: 300ms ease;
--transition-spring: spring(320, 32);

/* Z-index Scale */
--z-dropdown: 100;
--z-sticky: 200;
--z-fixed: 300;
--z-modal-backdrop: 400;
--z-modal: 500;
--z-popover: 600;
--z-tooltip: 700;
--z-toast: 800;
```

---

## 16. SUPPORT & EXTENSION

### Adding New UI Components
1. Follow the shadcn/ui pattern (CVA + forwardRef + cn)
2. Export from `components/ui/index.ts` (create if needed)
3. Add to `tailwind.config.ts` content paths if new folder

### Extending Theme
- Add custom colors to `tailwind.config.ts` → `theme.extend.colors`
- Add custom animations to `theme.extend.keyframes` + `animation`
- Add custom fonts to `theme.extend.fontFamily`

### Performance Tips
- Use `React.memo` for heavy list items
- Virtualize long lists (`@tanstack/react-virtual`)
- Lazy-load pages: `const Page = lazy(() => import('./Page'))`
- Optimize images (WebP, proper sizing)

---

**Generated from Edu Transform LMS v1.0**  
*Designed & Deployed by Aman Hukkerikar*  
*This document captures the complete frontend architecture for faithful replication.*