# Orbiter Design System

**v1.0 | April 24, 2026**
**Stack:** Next.js 14 + Tailwind CSS v4

---

## Summary

Orbiter's visual language draws from the restraint of Linear, the spatial clarity of Notion, and the data density of Stripe. The system uses a single typeface (Inter), a neutral-first palette with a muted indigo accent, tight border radii, barely-there shadows, and fast but invisible animations. Every decision optimizes for long-session comfort and information density without visual fatigue.

---

## 1. Color Palette

All values defined as CSS custom properties in `globals.css`. Components use semantic tokens (`bg-surface`, `text-primary`) -- never raw hex.

### Light Mode

```css
:root {
  /* Backgrounds */
  --color-bg-page:       #FAFAFA;     /* hsl(0 0% 98%) — page canvas */
  --color-bg-surface:    #FFFFFF;     /* hsl(0 0% 100%) — cards, panels */
  --color-bg-elevated:   #FFFFFF;     /* hsl(0 0% 100%) — popovers, dropdowns */
  --color-bg-overlay:    rgba(0, 0, 0, 0.45); /* modal backdrop */
  --color-bg-subtle:     #F4F4F5;     /* hsl(240 5% 96%) — hover fills, zebra rows */
  --color-bg-muted:      #EDEDEF;     /* hsl(240 4% 93%) — selected states, active fills */

  /* Text */
  --color-text-primary:   #1C1C22;    /* hsl(240 10% 12%) — headings, body */
  --color-text-secondary: #5C5C6B;    /* hsl(240 8% 39%) — descriptions, meta */
  --color-text-muted:     #8B8B9A;    /* hsl(240 7% 57%) — placeholders, hints */
  --color-text-disabled:  #B4B4C0;    /* hsl(240 8% 73%) — disabled labels */
  --color-text-inverse:   #FAFAFA;    /* on dark backgrounds */

  /* Borders */
  --color-border-subtle:  #EBEBEF;    /* hsl(240 10% 93%) — card edges */
  --color-border-default: #DDDDE3;    /* hsl(240 8% 87%) — inputs, dividers */
  --color-border-strong:  #C2C2CC;    /* hsl(240 8% 77%) — focused inputs */

  /* Accent — Muted Indigo */
  --color-accent:         #5B5FC7;    /* hsl(237 40% 57%) — primary buttons, links */
  --color-accent-hover:   #4E52B0;    /* hsl(237 40% 50%) */
  --color-accent-muted:   #E8E9F5;    /* hsl(237 40% 93%) — badges, tinted bg */
  --color-accent-text:    #4248A6;    /* hsl(237 43% 46%) — accent on light bg */

  /* Semantic — Muted, NOT saturated */
  --color-success:        #2E7D57;    /* hsl(153 46% 34%) */
  --color-success-muted:  #E6F4ED;    /* hsl(153 40% 92%) */
  --color-warning:        #B5850B;    /* hsl(44 88% 38%) */
  --color-warning-muted:  #FEF5E0;    /* hsl(44 90% 94%) */
  --color-error:          #C93B3B;    /* hsl(0 55% 51%) */
  --color-error-muted:    #FCE9E9;    /* hsl(0 70% 94%) */
  --color-info:           #3178B9;    /* hsl(210 55% 46%) */
  --color-info-muted:     #E5F0FA;    /* hsl(210 60% 94%) */

  /* Priority */
  --color-p0:             #C93B3B;    /* urgent — same as error */
  --color-p0-muted:       #FCE9E9;
  --color-p1:             #D97A0B;    /* hsl(32 88% 45%) — high */
  --color-p1-muted:       #FDF0DD;
  --color-p2:             #5B5FC7;    /* medium — same as accent */
  --color-p2-muted:       #E8E9F5;
  --color-p3:             #8B8B9A;    /* low — same as muted text */
  --color-p3-muted:       #F4F4F5;
}
```

### Dark Mode

```css
.dark {
  /* Backgrounds */
  --color-bg-page:       #101012;     /* hsl(240 8% 7%) */
  --color-bg-surface:    #18181B;     /* hsl(240 6% 10%) — zinc-900 */
  --color-bg-elevated:   #1F1F24;     /* hsl(240 8% 13%) — popovers */
  --color-bg-overlay:    rgba(0, 0, 0, 0.60);
  --color-bg-subtle:     #1F1F24;     /* hover fills */
  --color-bg-muted:      #27272C;     /* hsl(240 6% 16%) — active states */

  /* Text */
  --color-text-primary:   #F0F0F3;    /* hsl(240 12% 95%) */
  --color-text-secondary: #A0A0AE;    /* hsl(240 6% 65%) */
  --color-text-muted:     #6E6E7A;    /* hsl(240 5% 45%) */
  --color-text-disabled:  #4A4A54;    /* hsl(240 6% 31%) */
  --color-text-inverse:   #1C1C22;

  /* Borders */
  --color-border-subtle:  #222228;    /* hsl(240 6% 14%) */
  --color-border-default: #2C2C34;    /* hsl(240 8% 19%) */
  --color-border-strong:  #3C3C46;    /* hsl(240 8% 25%) */

  /* Accent */
  --color-accent:         #7578D9;    /* hsl(237 52% 65%) — lifted for dark bg */
  --color-accent-hover:   #8487E0;    /* hsl(237 55% 70%) */
  --color-accent-muted:   #1E1E30;    /* hsl(240 25% 15%) */
  --color-accent-text:    #9598E5;    /* hsl(237 55% 74%) */

  /* Semantic — Desaturated for dark */
  --color-success:        #3BA874;    /* hsl(153 48% 44%) */
  --color-success-muted:  #132E22;    /* hsl(153 40% 13%) */
  --color-warning:        #D4A030;    /* hsl(44 70% 51%) */
  --color-warning-muted:  #2E2510;    /* hsl(44 50% 12%) */
  --color-error:          #E05555;    /* hsl(0 65% 60%) */
  --color-error-muted:    #301414;    /* hsl(0 40% 14%) */
  --color-info:           #4A9ADA;    /* hsl(210 60% 57%) */
  --color-info-muted:     #121E2C;    /* hsl(210 40% 12%) */

  /* Priority */
  --color-p0:             #E05555;
  --color-p0-muted:       #301414;
  --color-p1:             #E0A030;
  --color-p1-muted:       #2E2510;
  --color-p2:             #7578D9;
  --color-p2-muted:       #1E1E30;
  --color-p3:             #6E6E7A;
  --color-p3-muted:       #1F1F24;
}
```

---

## 2. Typography

**Single typeface: Inter Variable** (self-hosted, `.woff2`).
Use `Inter Display` optical size (`font-variation-settings: 'opsz' 32`) for text at 24px and above.

### Type Scale

| Token           | Size   | Weight | Line Height | Letter Spacing | Use                        |
|-----------------|--------|--------|-------------|----------------|----------------------------|
| `text-display`  | 36px   | 600    | 1.1         | -0.025em       | Page titles                |
| `text-h1`       | 24px   | 600    | 1.2         | -0.02em        | Section headings           |
| `text-h2`       | 20px   | 600    | 1.3         | -0.015em       | Subsection headings        |
| `text-h3`       | 16px   | 600    | 1.4         | -0.01em        | Card titles                |
| `text-body`     | 14px   | 400    | 1.5         | -0.006em       | Default body, descriptions |
| `text-sm`       | 13px   | 400    | 1.5         | 0              | Meta, timestamps, hints    |
| `text-xs`       | 12px   | 500    | 1.4         | 0.01em         | Badges, labels, overlines  |
| `text-mono`     | 13px   | 400    | 1.5         | 0              | Code, env vars, IDs        |

**Monospace:** `JetBrains Mono` or `Berkeley Mono` (for code blocks, env variable names, IDs).

**Rules:**
- 14px is the floor for body text. 12px only for badges and labels.
- Headings use negative tracking. Body stays near-neutral.
- Weight 500 (medium) for emphasis within body. Never use bold (700) inside paragraphs.
- All-caps labels: 12px, weight 500, letter-spacing +0.06em.

---

## 3. Spacing & Radius

### Spacing Scale (4px base)

| Token | Value |
|-------|-------|
| `0.5` | 2px   |
| `1`   | 4px   |
| `1.5` | 6px   |
| `2`   | 8px   |
| `3`   | 12px  |
| `4`   | 16px  |
| `5`   | 20px  |
| `6`   | 24px  |
| `8`   | 32px  |
| `10`  | 40px  |
| `12`  | 48px  |
| `16`  | 64px  |

### Card Padding

- Compact cards (task rows, list items): `12px 16px`
- Standard cards (bug detail, epic card): `16px 20px`
- Large panels (doc editor, settings page): `24px 32px`
- Modals: `24px`

### Border Radius

| Token      | Value  | Use                                  |
|------------|--------|--------------------------------------|
| `radius-sm`   | 4px    | Badges, inline tags, small chips     |
| `radius-md`   | 6px    | Buttons, inputs, dropdowns           |
| `radius-lg`   | 8px    | Cards, panels, modals                |
| `radius-xl`   | 12px   | Feature sections, large containers   |
| `radius-full` | 9999px | Avatars, pills, status dots          |

**Philosophy:** Slightly rounded, never bubbly. 6px on buttons is the signature -- tight enough to feel professional, soft enough to not feel harsh. Never mix drastically different radii on adjacent elements.

---

## 4. Shadows & Elevation

Shadows are barely visible. Depth comes from background color layering (page < surface < elevated), not heavy shadows.

### Light Mode Shadows

```css
:root {
  --shadow-xs:    0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-sm:    0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-md:    0 4px 8px -2px rgba(0, 0, 0, 0.06), 0 2px 4px -2px rgba(0, 0, 0, 0.04);
  --shadow-lg:    0 12px 24px -4px rgba(0, 0, 0, 0.08), 0 4px 8px -2px rgba(0, 0, 0, 0.03);
  --shadow-focus: 0 0 0 2px var(--color-bg-page), 0 0 0 4px var(--color-accent);
}
```

### Dark Mode Shadows

```css
.dark {
  --shadow-xs:    0 1px 2px rgba(0, 0, 0, 0.20);
  --shadow-sm:    0 1px 3px rgba(0, 0, 0, 0.30), 0 1px 2px rgba(0, 0, 0, 0.20);
  --shadow-md:    0 4px 8px -2px rgba(0, 0, 0, 0.35), 0 2px 4px -2px rgba(0, 0, 0, 0.20);
  --shadow-lg:    0 12px 24px -4px rgba(0, 0, 0, 0.45), 0 4px 8px -2px rgba(0, 0, 0, 0.15);
  --shadow-focus: 0 0 0 2px var(--color-bg-page), 0 0 0 4px var(--color-accent);
}
```

### Usage

| Level    | Shadow       | Use                         |
|----------|--------------|-----------------------------|
| Flat     | none         | Table rows, list items      |
| Subtle   | `shadow-xs`  | Cards at rest               |
| Lifted   | `shadow-sm`  | Cards on hover, popovers    |
| Floating | `shadow-md`  | Dropdowns, command palette  |
| Overlay  | `shadow-lg`  | Modals, notification panels |

**Rule:** In dark mode, rely almost entirely on border-subtle and background layering for depth. Shadows are supplementary -- most dark-mode elevation is `border 1px border-subtle + bg-elevated` with no shadow at all.

---

## 5. Animation Philosophy

Animations should be invisible -- the user should feel speed, not see motion. Inspired by Superhuman's sub-100ms interaction target.

### Timing

| Action              | Duration | Easing                            |
|---------------------|----------|-----------------------------------|
| Hover color/bg      | 120ms    | `ease`                            |
| Button press scale  | 80ms     | `cubic-bezier(0.4, 0, 0.2, 1)`   |
| Dropdown open       | 150ms    | `cubic-bezier(0.16, 1, 0.3, 1)`  |
| Dropdown close      | 100ms    | `cubic-bezier(0.4, 0, 1, 1)`     |
| Modal enter         | 200ms    | `cubic-bezier(0.16, 1, 0.3, 1)`  |
| Modal exit          | 120ms    | `cubic-bezier(0.4, 0, 1, 1)`     |
| Toast slide in      | 250ms    | `cubic-bezier(0.16, 1, 0.3, 1)`  |
| Page transition     | 0ms      | none — instant content swap       |
| Kanban drag         | 150ms    | `cubic-bezier(0.2, 0, 0, 1)`     |

### CSS Custom Properties

```css
:root {
  --ease-out:    cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in:     cubic-bezier(0.4, 0, 1, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
  --duration-fast:   80ms;
  --duration-normal: 150ms;
  --duration-slow:   250ms;
}
```

### Rules

- **Only animate** `transform` and `opacity`. Never animate `width`, `height`, `padding`, `top`, `left`.
- **Exit is always faster** than enter (120ms exit vs 200ms enter).
- **No page transitions.** Route changes are instant. Content appears immediately.
- **No loading spinners for < 300ms.** Show a spinner only if the operation takes longer.
- **No bounce or spring physics.** Linear motion or smooth ease-out only. Springs feel playful; Orbiter feels precise.
- **Respect `prefers-reduced-motion`:** Disable all transitions. Show/hide instantly.
- **Kanban drag:** Subtle scale (1.02) + shadow-md on pickup. Other cards shift with 150ms ease-out.

---

## 6. Component Styling Notes

### Buttons

```
Primary:   bg-accent, text-white, rounded-md (6px), h-8 (32px), px-3, text-sm font-medium
           hover: bg-accent-hover, transition 120ms
           active: scale(0.98), transition 80ms
           focus: shadow-focus ring

Secondary: bg-transparent, border border-default, text-secondary
           hover: bg-subtle, border-strong
           active: bg-muted

Ghost:     bg-transparent, no border, text-secondary
           hover: bg-subtle
```

- Button height: 32px standard, 28px compact, 36px large.
- No gradients on buttons. Ever. Flat fills only.
- Disabled: opacity-50, cursor-not-allowed. No color change.

### Inputs

```
Default:   bg-surface, border border-default, rounded-md, h-8, px-3, text-body
           placeholder: text-muted
           hover: border-strong
           focus: border-accent + shadow-focus
           error: border-error, focus ring uses error color
```

- No inner shadows (no inset shadow on inputs).
- Labels: text-sm, font-medium, text-primary, mb-1.5.

### Cards

```
Default:   bg-surface, border border-subtle, rounded-lg (8px), shadow-xs
           hover (if clickable): shadow-sm, border-default, transition 120ms
```

- Cards never have colored backgrounds unless explicitly semantic (error state, priority tint).
- No thick borders. Always 1px.

### Badges / Tags

```
Default:   text-xs, font-medium, px-2, py-0.5, rounded-sm (4px)
           bg: semantic-muted (e.g., bg-accent-muted for status)
           text: semantic color (e.g., text-accent-text)
           border: none
```

- Priority badges use their respective priority-muted bg + priority color text.
- Status badges (backlog, in_progress, done) each get their own muted bg.

### Tables

```
Header:    bg-subtle, text-xs uppercase tracking-wide text-muted font-medium
           border-b border-default
Row:       bg-surface, border-b border-subtle
           hover: bg-subtle
           selected: bg-muted
Cell:      py-2.5 px-4, text-body
```

- No zebra stripes by default. Hover highlight is sufficient.
- Inline edit: cell becomes an input on click with no layout shift.
- Sticky header with `backdrop-blur-sm` + `bg-surface/90`.

### Sidebar Navigation

```
Item:      text-sm, text-secondary, py-1.5, px-2, rounded-md
           hover: bg-subtle, text-primary
           active: bg-muted, text-primary, font-medium
```

- Active indicator: left border (2px accent) or filled background. Not both.
- Section headers: text-xs, uppercase, text-muted, tracking-wide, mt-6 mb-2.

### Focus States

- All interactive elements: `shadow-focus` (double ring — page-color inner, accent outer).
- Keyboard focus only. Use `:focus-visible`, not `:focus`.
- Tab order must be logical. Every action reachable by keyboard.

### Command Palette (Raycast-style)

```
Container: bg-elevated, border border-subtle, rounded-xl (12px), shadow-lg
           max-w-lg, centered vertically (slightly above center: top ~38%)
Input:     border-none, bg-transparent, text-h3 size, autofocus
Results:   text-sm, py-2 px-3, rounded-md on hover
           selected: bg-subtle
Shortcut:  text-xs text-muted, monospace, right-aligned
```

---

## 7. What to AVOID

These patterns immediately signal "AI-generated" or "template" UI:

1. **Gradient backgrounds on cards or buttons.** Flat fills only. Gradients belong only in marketing hero sections, if at all.

2. **Neon/glowing accent colors.** No `#7C3AED` violet glow, no cyan `#06B6D4`, no electric blue `#3B82F6` at full saturation. The accent is muted indigo, not a neon signpost.

3. **Overly rounded corners.** `rounded-2xl` (16px) on small elements like buttons or inputs looks like a toy. Keep it at 6px for controls, 8px for cards.

4. **Shadows that are too large or too dark.** If you can clearly see a shadow, it is too heavy. Shadows should be felt, not seen.

5. **Icon-heavy empty states with big illustrations.** Use a short text message, an action button, and maybe a small muted icon. No cartoon illustrations.

6. **Rainbow status colors at full brightness.** Semantic colors should be muted. A red badge should not scream; it should inform.

7. **Inconsistent spacing.** Every spacing value must come from the 4px scale. No arbitrary padding (e.g., 18px, 22px, 15px).

8. **Multiple typefaces.** One font family. Hierarchy through weight and size, never through switching fonts between headings and body.

9. **Hover effects that move layout.** No elements growing in size, adding borders, or shifting position on hover. Only color/opacity/shadow changes.

10. **Default shadcn/Radix styling shipped without modification.** Customize the theme tokens. Change the default radius, adjust the gray scale to have slight warmth or coolness. The defaults are recognizable.

11. **Centered hero layouts for app screens.** Centered text is for marketing. App UI is left-aligned, dense, functional.

12. **Decorative borders, dividers, or ornaments.** If a border does not separate two distinct content regions, remove it.

13. **Loading skeletons that pulse too brightly.** Skeleton pulse should be `bg-subtle` to `bg-muted`, barely noticeable. Duration: 1.5s, ease-in-out.

---

## Tailwind v4 Implementation

### globals.css

```css
@import "tailwindcss";

@theme {
  /* Override Tailwind defaults with Orbiter tokens */
  --color-page: var(--color-bg-page);
  --color-surface: var(--color-bg-surface);
  --color-elevated: var(--color-bg-elevated);
  --color-subtle: var(--color-bg-subtle);
  --color-muted: var(--color-bg-muted);

  --color-primary: var(--color-text-primary);
  --color-secondary: var(--color-text-secondary);

  --color-accent: var(--color-accent);
  --color-accent-hover: var(--color-accent-hover);
  --color-accent-muted: var(--color-accent-muted);

  --color-success: var(--color-success);
  --color-warning: var(--color-warning);
  --color-error: var(--color-error);
  --color-info: var(--color-info);

  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 12px;

  --shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-md: 0 4px 8px -2px rgba(0, 0, 0, 0.06), 0 2px 4px -2px rgba(0, 0, 0, 0.04);
  --shadow-lg: 0 12px 24px -4px rgba(0, 0, 0, 0.08), 0 4px 8px -2px rgba(0, 0, 0, 0.03);

  --font-sans: 'Inter Variable', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'JetBrains Mono', 'Berkeley Mono', ui-monospace, monospace;

  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
}

@layer base {
  :root {
    color-scheme: light;
    /* Paste full light-mode token block from Section 1 */
  }

  .dark {
    color-scheme: dark;
    /* Paste full dark-mode token block from Section 1 */
  }

  body {
    @apply bg-page text-primary antialiased;
    font-feature-settings: 'cv11' 1, 'ss01' 1;   /* Inter alternates */
    -webkit-font-smoothing: antialiased;
  }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }
}
```

---

## Design Decision Log

| Decision | Rationale |
|----------|-----------|
| Muted indigo accent (#5B5FC7) | Distinctive without being loud. Linear uses #5E6AD2; we shift slightly to avoid a direct clone. Indigo reads as trustworthy and professional. |
| Inter only, no second font | One font eliminates the "two-font template" look. Weight and size do all the hierarchy work. |
| 6px button radius | Signature feel. Tight enough for a professional tool, softer than Vercel's 4px, less bubbly than 8px. |
| No page transitions | Superhuman-style instant swaps. Speed is the animation. |
| Dark mode: layered backgrounds, minimal shadows | Vercel/Linear approach. Background tiers (#101012 < #18181B < #1F1F24) create depth without heavy box-shadows. |
| Priority colors reuse semantic palette | P0=error, P1=warning, P2=accent, P3=muted. Fewer unique colors to maintain, instant recognition. |
