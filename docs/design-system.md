# Service Income Tracker — Design System & Application Design

> **Status:** Specification (v1). This document defines the visual language, design tokens,
> component library, and concrete screen designs for the app. It is the **single source of
> truth** that tasks 03–07 implement against.
>
> **Scope note:** This is a *written specification*. No production code, dependencies, or
> tokens are installed yet. All code blocks are **paste-ready reference** for implementers —
> see the [Implementation appendix](#7-implementation-appendix) for how to wire it up.

---

## Table of contents

1. [Foundations & principles](#1-foundations--principles)
2. [Design tokens](#2-design-tokens)
3. [Iconography](#3-iconography)
4. [Component library](#4-component-library)
5. [Screen designs](#5-screen-designs)
6. [Patterns & guidance](#6-patterns--guidance)
7. [Implementation appendix](#7-implementation-appendix)
8. [Sources](#8-sources)

---

## 1. Foundations & principles

**Brand in one line:** *A calm, fast, trustworthy ledger for freelancers — log income in
seconds, understand it at a glance.*

**Visual direction:** Modern indigo SaaS. A cool, neutral slate canvas; **indigo** as the
single brand/action color; **emerald** reserved for money/positive figures; red/amber/sky for
danger/warning/info. Restraint is the point — in finance UIs, color carries meaning, not
decoration.

### Design principles

| Principle | What it means | Concrete rule |
|---|---|---|
| **Glanceable** | Mobile users scan in short, one-handed sessions. | Lead each screen with the one number that matters, set in large tabular figures. Max 6–8 colors in view. |
| **Trustworthy** | It handles someone's earnings. | Neutral foundation; green/red only where they signal meaning; never use color as the *sole* signal. Predictable, conventional layouts. |
| **Fast** | The Log Income screen is used daily. | Primary action reachable by thumb; service select pre-fills price; form resets after save; target interaction loads < 2s. |
| **Accessible-first** | WCAG 2.1 AA is the floor, not a feature. | ≥4.5:1 text contrast, ≥3:1 large text/UI; visible focus rings; 44×44px touch targets; honor `prefers-reduced-motion`. |
| **One-handed mobile** | Phone-first PWA, installable. | Bottom tab bar for primary nav; reachable CTAs; respect safe-area insets; scale up to a sidebar at `md`. |

### Platform constraints (carry forward)

- **Tailwind v4, CSS-first.** Tokens live in `@theme` as CSS custom properties — portable,
  inspectable in DevTools, switchable at runtime without a rebuild.
- **Capacitor-ready.** Tokens are plain CSS variables, so the same theme survives a future
  native wrap. `src/lib/calc.ts` stays styling-free (per `CLAUDE.md`).
- **Tailwind-only styling, no inline styles, Recharts-only charts** — this system is built
  entirely on utility classes + tokens to respect those `CLAUDE.md` constraints.

---

## 2. Design tokens

Tokens are the contract. Components and screens reference **semantic** tokens
(`--color-surface`, `--color-primary`) — never raw ramp values — so light/dark and future
re-themes are a one-file change.

### 2.1 Color — primitive ramps (OKLCH)

OKLCH gives perceptually even steps and predictable contrast. These are the raw materials;
UI code should rarely touch them directly.

| Ramp | Role | 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **slate** | neutral / surfaces / text | `.985 .003 250` | `.968 .005 251` | `.929 .009 253` | `.869 .017 253` | `.711 .035 257` | `.556 .041 257` | `.446 .04 257` | `.372 .038 258` | `.279 .037 260` | `.21 .037 264` | `.135 .03 262` |
| **indigo** | primary / action | `.962 .018 272` | `.93 .034 272` | `.87 .065 274` | `.785 .115 274` | `.673 .17 276` | `.585 .22 277` | `.511 .238 277` | `.457 .227 277` | `.398 .195 277` | `.359 .144 278` | `.257 .09 281` |
| **emerald** | positive / money in | `.979 .021 166` | `.95 .052 163` | `.905 .093 165` | `.845 .143 165` | `.765 .177 163` | `.696 .17 162` | `.596 .145 163` | `.508 .118 165` | `.432 .095 166` | `.378 .077 168` | `.262 .051 172` |
| **red** | danger / negative | `.971 .013 17` | `.936 .032 17` | `.885 .062 18` | `.808 .114 19` | `.704 .191 22` | `.637 .237 25` | `.577 .245 27` | `.505 .213 27` | `.444 .177 26` | `.396 .141 25` | `.258 .092 26` |
| **amber** | warning | `.987 .022 95` | `.962 .059 95` | `.924 .12 95` | `.879 .169 91` | `.828 .189 84` | `.769 .188 70` | `.666 .179 58` | `.555 .163 49` | `.473 .137 46` | `.414 .112 45` | `.279 .077 46` |
| **sky** | info | `.977 .013 236` | `.951 .026 237` | `.901 .058 230` | `.828 .111 230` | `.746 .16 233` | `.685 .169 237` | `.588 .158 242` | `.5 .134 242` | `.443 .11 240` | `.391 .09 240` | `.293 .066 243` |

> Format: `lightness chroma hue` → use as `oklch(L C H)`. e.g. indigo 500 = `oklch(0.585 0.22 277)`.

### 2.2 Color — semantic tokens (light + dark)

Defined once in `@theme` (light defaults), overridden under `.dark`. This is the layer the UI
consumes.

```css
@import 'tailwindcss';

/* Manual override wins; otherwise follow the OS. The .dark class is toggled on <html>. */
@custom-variant dark (&:where(.dark, .dark *));

@theme {
  /* Surfaces & lines (light) */
  --color-bg:             oklch(0.985 0.003 250);  /* app canvas        */
  --color-surface:        oklch(1 0 0);            /* cards, sheets     */
  --color-surface-muted:  oklch(0.968 0.005 251);  /* subtle fills, rows*/
  --color-border:         oklch(0.929 0.009 253);  /* hairlines         */
  --color-border-strong:  oklch(0.869 0.017 253);  /* inputs, dividers  */

  /* Text */
  --color-fg:        oklch(0.21 0.037 264);   /* primary text  — 13.8:1 on bg */
  --color-fg-muted:  oklch(0.446 0.04 257);   /* secondary     —  5.9:1 on bg */
  --color-fg-subtle: oklch(0.556 0.041 257);  /* placeholders/captions — 4.6:1 */

  /* Brand / action */
  --color-primary:        oklch(0.511 0.238 277); /* indigo-600 */
  --color-primary-hover:  oklch(0.457 0.227 277); /* indigo-700 */
  --color-primary-fg:     oklch(1 0 0);           /* text on primary */
  --color-primary-subtle: oklch(0.962 0.018 272); /* indigo-50 tint  */
  --color-ring:           oklch(0.585 0.22 277);  /* focus ring      */

  /* Semantic status (text-on-bg safe) */
  --color-positive:        oklch(0.508 0.118 165); /* emerald-700, money in */
  --color-positive-subtle: oklch(0.95 0.052 163);
  --color-negative:        oklch(0.577 0.245 27);  /* red-600 */
  --color-negative-subtle: oklch(0.936 0.032 17);
  --color-warning:         oklch(0.555 0.163 49);  /* amber-700 */
  --color-warning-subtle:  oklch(0.962 0.059 95);
  --color-info:            oklch(0.588 0.158 242); /* sky-600 */
  --color-info-subtle:     oklch(0.951 0.026 237);

  /* Chart series — distinct hues, color-blind conscious, ordered by emphasis */
  --color-chart-1: oklch(0.585 0.22 277);  /* indigo  */
  --color-chart-2: oklch(0.696 0.17 162);  /* emerald */
  --color-chart-3: oklch(0.769 0.188 70);  /* amber   */
  --color-chart-4: oklch(0.685 0.169 237); /* sky     */
  --color-chart-5: oklch(0.637 0.237 25);  /* red     */
  --color-chart-6: oklch(0.673 0.17 276);  /* violet  */

  /* Type */
  --font-sans: 'Inter Variable', 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto,
               'Helvetica Neue', Arial, sans-serif;

  /* Radius */
  --radius-sm: 0.375rem; /* 6px  */
  --radius-md: 0.625rem; /* 10px — controls */
  --radius-lg: 0.875rem; /* 14px — cards    */
  --radius-xl: 1.25rem;  /* 20px — sheets   */

  /* Elevation (light) */
  --shadow-xs: 0 1px 2px 0 oklch(0.21 0.037 264 / 0.05);
  --shadow-sm: 0 1px 3px 0 oklch(0.21 0.037 264 / 0.08), 0 1px 2px -1px oklch(0.21 0.037 264 / 0.08);
  --shadow-md: 0 4px 12px -2px oklch(0.21 0.037 264 / 0.10), 0 2px 6px -2px oklch(0.21 0.037 264 / 0.08);
  --shadow-lg: 0 12px 28px -6px oklch(0.21 0.037 264 / 0.14), 0 4px 10px -4px oklch(0.21 0.037 264 / 0.10);

  /* Motion */
  --ease-standard:   cubic-bezier(0.2, 0, 0, 1);
  --ease-emphasized: cubic-bezier(0.3, 0, 0, 1);
  --duration-fast: 120ms;
  --duration-base: 200ms;
  --duration-slow: 320ms;
}

/* Dark theme — same token names, re-pointed values. */
.dark {
  --color-bg:             oklch(0.165 0.02 264);
  --color-surface:        oklch(0.21 0.024 263);
  --color-surface-muted:  oklch(0.255 0.026 262);
  --color-border:         oklch(0.31 0.03 261);
  --color-border-strong:  oklch(0.372 0.038 258);

  --color-fg:        oklch(0.97 0.005 250);
  --color-fg-muted:  oklch(0.75 0.03 256);
  --color-fg-subtle: oklch(0.62 0.035 257);

  --color-primary:        oklch(0.673 0.17 276);   /* lift for dark surfaces */
  --color-primary-hover:  oklch(0.745 0.13 275);
  --color-primary-fg:     oklch(0.21 0.037 264);
  --color-primary-subtle: oklch(0.30 0.06 277);
  --color-ring:           oklch(0.673 0.17 276);

  --color-positive:        oklch(0.765 0.177 163);
  --color-positive-subtle: oklch(0.33 0.07 168);
  --color-negative:        oklch(0.704 0.191 22);
  --color-negative-subtle: oklch(0.33 0.09 25);
  --color-warning:         oklch(0.828 0.189 84);
  --color-warning-subtle:  oklch(0.33 0.08 60);
  --color-info:            oklch(0.746 0.16 233);
  --color-info-subtle:     oklch(0.31 0.08 240);

  --color-chart-1: oklch(0.673 0.17 276);
  --color-chart-2: oklch(0.765 0.177 163);
  --color-chart-3: oklch(0.828 0.189 84);
  --color-chart-4: oklch(0.746 0.16 233);
  --color-chart-5: oklch(0.704 0.191 22);
  --color-chart-6: oklch(0.785 0.115 274);

  /* Dark elevation: rely on borders + deeper, softer shadow. */
  --shadow-xs: 0 1px 2px 0 oklch(0 0 0 / 0.30);
  --shadow-sm: 0 1px 3px 0 oklch(0 0 0 / 0.40);
  --shadow-md: 0 4px 12px -2px oklch(0 0 0 / 0.50);
  --shadow-lg: 0 12px 28px -6px oklch(0 0 0 / 0.55);
}
```

> **Why two `--color-primary` values?** Indigo-600 has enough contrast on white but goes
> muddy on dark surfaces, so dark mode lifts the primary to indigo-400 and flips
> `--color-primary-fg` to dark text for AA on buttons.

### 2.3 System-preference bootstrap

Apply the theme before first paint to avoid a flash. Reference snippet for `index.html` /
an early module:

```html
<script>
  (function () {
    var saved = localStorage.getItem('theme'); // 'light' | 'dark' | null
    var dark = saved ? saved === 'dark'
                     : matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark', dark);
  })();
</script>
```

Also keep the PWA `theme-color` in sync (see [§6.6](#66-pwa--mobile)).

### 2.4 Typography

**Inter Variable** — designed for UI, with excellent **tabular figures** (`tnum`) so money
columns align. Fallback to the system stack.

```css
:root { font-family: var(--font-sans); }
/* Money & any compared figures: */
.tabular { font-variant-numeric: tabular-nums; }
```

| Token | Size / line-height | Weight | Tracking | Use |
|---|---|---|---|---|
| `display`  | 36 / 40 | 700 | -0.02em | Hero number on Stats |
| `h1`       | 28 / 34 | 700 | -0.01em | Screen title |
| `h2`       | 22 / 28 | 600 | -0.01em | Section header |
| `h3`       | 18 / 24 | 600 | normal | Card title |
| `body-lg`  | 16 / 24 | 400 | normal | Primary reading / inputs |
| `body`     | 14 / 20 | 400 | normal | Default UI text |
| `sm`       | 13 / 18 | 400 | normal | Helper text, table cells |
| `caption`  | 12 / 16 | 500 | 0.01em | Labels, badges, meta |
| `mono-num` | inherits | 600 | normal | Big money values (`tabular`, `font-feature-settings: 'tnum'`) |

**Rules:** money and any numbers users compare are **always** `tabular-nums`. Body text stays
≥14px. Never go below 12px.

### 2.5 Spacing, sizing, radius, z-index

- **Spacing:** 4px base — `1`=4, `2`=8, `3`=12, `4`=16, `6`=24, `8`=32, `12`=48. Screen
  gutter `16px` mobile / `24px` ≥md. Card padding `16–20px`.
- **Touch targets:** interactive elements **min 44×44px**. Control heights: `sm` 36 / `md` 44 / `lg` 52.
- **Containers:** content max-width `640px` (forms), `1024px` (stats/tables) centered ≥md.
- **Radius:** `sm` 6 (badges/inputs-inline) · `md` 10 (buttons, inputs) · `lg` 14 (cards) ·
  `xl` 20 (bottom sheets) · `full` (pills, avatars).
- **Breakpoints (mobile-first):** `sm` 640 · `md` 768 (nav switches to sidebar) · `lg` 1024 · `xl` 1280.
- **Z-index ladder:** base `0` · sticky header/tabbar `10` · dropdown/popover `20` ·
  overlay/scrim `30` · modal/sheet `40` · toast `50`.

---

## 3. Iconography

**Library:** `lucide-react`. **Default** 24px, **inline** 20px (16px in dense table cells),
stroke `1.75`, color `currentColor`. Icons are decorative-by-default (`aria-hidden`); when an
icon is the only label, add `aria-label`.

| Concept | Icon | Concept | Icon |
|---|---|---|---|
| Log income (tab/CTA) | `circle-plus` | Services | `tag` |
| Stats | `chart-column` | Import | `upload` |
| Money / earnings | `wallet` | Currency | `coins` |
| Commission % | `percent` | Date | `calendar` |
| Customer | `user-round` | Note | `pencil-line` |
| Delete | `trash-2` | Edit | `pencil` |
| Active / success | `check-circle-2` | Inactive | `circle-slash` |
| Warning | `triangle-alert` | Info | `info` |
| Account menu | `circle-user-round` | Theme toggle | `sun` / `moon` |
| Sign out | `log-out` | Empty/none | `inbox` |
| Drag-drop file | `file-up` | Success summary | `party-popper` |

---

## 4. Component library

Each component lists **anatomy → variants/sizes → states → tokens → a11y**. All live in
`src/components/ui/` as owned, Tailwind-styled React components. Where interaction/a11y is
non-trivial, build on the noted **Radix** primitive (the shadcn/ui pattern).

States covered everywhere: `default · hover · focus-visible · active · disabled · loading · error`.
Focus is always a 2px ring using `--color-ring` with a 2px offset (`outline-none` +
`ring-2 ring-[--color-ring] ring-offset-2`).

### 4.1 Button

- **Anatomy:** `[leading icon?] label [trailing icon?]`; optional spinner replaces leading icon when loading.
- **Variants:** `primary` (indigo fill) · `secondary` (surface + border) · `ghost` (transparent, hover fill) · `destructive` (red fill) · `link` (text + underline on hover).
- **Sizes:** `sm` 36h · `md` 44h (default) · `lg` 52h · `icon` (square, 44). Full-width modifier for mobile CTAs.
- **States:** hover → `--color-primary-hover`; disabled → 50% opacity + `cursor-not-allowed`, no hover; loading → spinner + `aria-busy`, label retained, click disabled.
- **Tokens:** `--color-primary / -hover / -fg`, `--radius-md`, `--shadow-xs`, `--duration-fast`.
- **A11y:** real `<button>`; icon-only sets `aria-label`; hit area ≥44px even at `sm` via padding.

### 4.2 Field (form row)

Standard wrapper composing **label + control + helper/error**, built for react-hook-form + Zod.

- **Anatomy:** `Label (+ required *)` → control → `Helper text` *or* `Error text` (mutually exclusive) with an inline `triangle-alert` on error.
- **States:** `invalid` flips control border → `--color-negative`, helper → error text, sets `aria-invalid` + `aria-describedby`.
- **A11y:** `<label htmlFor>` always present; error text linked via `aria-describedby`; required marked with `*` **and** `aria-required`.

### 4.3 Inputs

| Component | Notes | Radix? |
|---|---|---|
| **Text / Textarea** | 44h (textarea auto-grows), `--radius-md`, border `--color-border-strong`, focus ring. | — |
| **Number / Amount** | Right-aligned `tabular-nums`; amount variant shows a currency prefix/affix from profile currency. Used for price. | — |
| **Date** | Native `<input type="date">` styled to match; defaults to today on Log Income. | — |
| **Select** | Trigger looks like an input + `chevron-down`; popover list with checkmark on selected. Used for currency, service picker. | **Radix Select** |
| **Combobox** | Typeahead select for the service picker when lists grow; filters active services. | Radix Select/Popover + cmd list |
| **Switch** | The service active/inactive toggle and theme toggle. Track recolors to `--color-positive` when on. | **Radix Switch** |
| **Checkbox / Radio** | Standard; indigo when checked; 44px hit area. | Radix Checkbox/RadioGroup |

### 4.4 Containers

- **Card** — `surface` bg, `--color-border`, `--radius-lg`, `--shadow-sm`, padding 16–20. Slots: `header` (title + optional action), `body`, `footer`.
- **StatCard** — `caption` label + `display`/`mono-num` value (`tabular`) + optional delta pill (▲ positive / ▼ negative colored by sign). The glanceable hero unit on Stats.
- **List / ListItem** — used for recent entries: leading icon/avatar, primary + secondary text, trailing value (`tabular`) and overflow action. Rows divide with `--color-border`; hover `--color-surface-muted`.
- **Table** — ≥md: real columns with sticky header, right-aligned numeric cells (`tabular`). < md: **collapses to stacked cards** (label/value pairs) to stay readable one-handed. Used by Import preview.
- **SectionHeader** — `h2` + optional description + right-aligned action; consistent vertical rhythm.

### 4.5 Feedback

- **Badge / Pill** — `caption`, `--radius-full`, subtle-bg + status-fg. Presets: `Active` (positive), `Inactive` (neutral), `Imported` (info, source=import), `Manual` (neutral).
- **Toast** — bottom (above tab bar), auto-dismiss ~4s, variants success/error/info, optional **Undo** action (used for delete). **Radix Toast.**
- **Alert / Banner** — inline, icon + message, variants info/warning/error/success; subtle bg + matching border.
- **Skeleton** — shimmer blocks matching final layout; one per query-backed region.
- **Spinner** — sizes sm/md; used inside buttons and full-screen route loaders.
- **EmptyState** — centered `inbox`/contextual icon, short heading, one-line guidance, primary CTA. Every list/chart has one.
- **ErrorState** — `triangle-alert`, message, **Retry** button (re-runs the TanStack query).

### 4.6 Overlays

| Component | Use | Primitive |
|---|---|---|
| **Dialog / Modal** | Add/edit service; confirm destructive deletes. Centered card ≥sm. | **Radix Dialog** |
| **Bottom sheet** | Mobile variant of Dialog — slides from bottom, `--radius-xl` top corners, drag-handle, respects safe-area. | Radix Dialog + transform |
| **Dropdown menu** | Account menu (theme toggle, sign out), row overflow actions. | **Radix Dropdown Menu** |
| **Tabs** | Stats period toggle Week / Month / Year. Segmented-control styling. | **Radix Tabs** |

All overlays: scrim `oklch(0 0 0 / .45)` (z-30), content z-40, focus trapped, `Esc` closes,
focus restored to trigger on close (Radix handles this).

### 4.7 Navigation — app shell

```
Mobile (< md)                          Desktop (≥ md)
┌──────────────────────────┐           ┌──────┬──────────────────────┐
│ TopBar: title   ⊙ account│           │ Side │ TopBar: title  ⊙     │
├──────────────────────────┤           │ nav  ├──────────────────────┤
│                          │           │      │                      │
│        content           │           │ ▸Inc │      content         │
│      (scrolls)           │           │  Svc │    (max-w-1024)      │
│                          │           │  Stat│                      │
├──────────────────────────┤           │  Imp │                      │
│ [＋Income][Svc][Stat][Imp]│ tab bar   │      │                      │
└──────────────────────────┘  safe-area └──────┴──────────────────────┘
```

- **TopBar** — sticky, `surface` + bottom hairline, screen title (`h1`), right-side account
  dropdown (`circle-user-round`).
- **Bottom tab bar** — sticky, 4 destinations (Income / Services / Stats / Import), icon +
  `caption` label, active item in `--color-primary` with a 2px top indicator; `padding-bottom:
  env(safe-area-inset-bottom)`. Each tab ≥44px.
- **Sidebar (≥md)** — same 4 destinations vertically; tab bar hidden; content max-width applies.

### 4.8 Data visualization (Recharts)

Recharts only (per `CLAUDE.md`). Theme it from tokens so charts follow light/dark.

- **Series colors:** `--color-chart-1..6` in order. Income-by-service pie maps each service to
  the next series color; income-over-time bar/line uses `chart-1`.
- **Axes/grid:** axis text `--color-fg-muted` `sm`; gridlines `--color-border` (horizontal
  only); hide axis lines. Tick labels for values use `tabular-nums`.
- **Tooltip:** custom component styled as a `Card` (`surface`, `--shadow-md`, `--radius-md`),
  label `caption`, value `tabular`; never the default white box.
- **Bar/Line:** rounded bar tops (`radius-sm`), 1–2 series max for clarity; line uses 2px
  stroke + subtle area fill at ~12% alpha.
- **Pie/Donut:** donut (inner radius ~60%) with total in the center; external legend lists
  service name + total + %.
- **Empty state:** when no data, render `EmptyState` instead of an empty axis frame.
- **Reduced motion:** disable enter animations when `prefers-reduced-motion`.

---

## 5. Screen designs

Wireframes are mobile-first (the primary form factor); desktop notes follow. Every
query-backed region specifies its **loading / empty / error / success** behavior.

> **Visual reference:** token-accurate rendered mockups of every screen below (light + dark,
> mobile + desktop) live in [`mockups/`](./mockups/README.md). They're a reference for
> implementers, generated from the tokens in §2.2 — not production code.

### 5.1 Sign in / Sign up

```
┌──────────────────────────┐
│                          │
│        ◆  Income         │  brand mark + wordmark
│   Track what you earn.   │  caption, fg-muted
│                          │
│  ┌────────────────────┐  │
│  │ Email              │  │  Field → text input
│  │ [______________]   │  │
│  │ Password           │  │  Field → password input
│  │ [______________]   │  │
│  │ (Sign up: Name?)   │  │  optional display name
│  │                    │  │
│  │ [   Sign in    ]   │  │  primary, full-width
│  │  Error banner ⚠    │  │  on failed auth
│  └────────────────────┘  │
│  New here? Create account│  link → /sign-up
└──────────────────────────┘
```

- **Components:** centered `Card` (max-w 400), brand mark, `Field` ×2–3, full-width primary
  `Button`, inline `Alert` for auth errors, `link` to toggle modes.
- **Validation (Zod):** email format; password ≥8 chars. Errors render inline under each
  field; submit disabled until valid; button shows spinner while pending.
- **States:** loading (button spinner) · error (red banner "Invalid email or password") ·
  success (redirect to `/`).
- **Desktop:** same card, vertically centered on `bg`.

### 5.2 Log Income (Home — primary daily screen)

```
┌──────────────────────────┐
│ TopBar  Log income    ⊙  │
├──────────────────────────┤
│ ┌── Card ──────────────┐ │
│ │ Service              │ │  Select (active only) → prefills price
│ │ [ Haircut        ▾ ] │ │
│ │ Price        Date    │ │  Amount input | Date (today)
│ │ [ $40.00 ] [Jun 1 ]  │ │
│ │ Customer (optional)  │ │  text
│ │ [________________]   │ │
│ │ Note (optional)      │ │  textarea
│ │ [________________]   │ │
│ │ You earn  ► $6.00    │ │  live preview: computeEarnings(price, commission%)
│ │ [   Save entry    ]  │ │  primary, full-width
│ └──────────────────────┘ │
│ Recent                   │  SectionHeader
│ ┌──────────────────────┐ │
│ │ Haircut    Jun 1  $6 │ │  ListItem (amount_earned, tabular) + ⋯ delete
│ │ Massage    May 31 $18│ │
│ │ …last 10–20…    [🗑] │ │
│ └──────────────────────┘ │
├──────────────────────────┤
│ [＋Income][Svc][Stat][Imp]│
└──────────────────────────┘
```

- **Components:** `Card` form (Select, Amount, Date, text, textarea), earnings preview row
  (`positive` color, `tabular`), full-width primary `Button`, `SectionHeader` + `List`.
- **Behavior:** selecting a service prefills price (editable for discounts); date defaults to
  today; "You earn" updates live via `computeEarnings`. On save the entry is inserted with
  `price_snapshot`, `commission_pct_snapshot`, `amount_earned` (never recalculated), the form
  **resets**, and a success `Toast` shows. Delete is optimistic with an **Undo** toast.
- **States:** loading (form skeleton + list skeleton) · empty (list shows EmptyState "No
  entries yet — log your first above") · error (ErrorState with Retry) · no active services
  (Select disabled + inline hint linking to Services).
- **Desktop:** form (max-w 640) left, recent list right at `lg`; otherwise stacked.

### 5.3 Services & settings

```
┌──────────────────────────┐
│ TopBar  Services      ⊙  │
├──────────────────────────┤
│ Settings                 │  SectionHeader
│ ┌──────────────────────┐ │
│ │ Commission   [ 15 %] │ │  number Field (0–100)
│ │ Currency     [USD ▾] │ │  Select
│ │ ⓘ Applies to new      │ │  Alert(info): snapshots protect past entries
│ │   entries only.      │ │
│ └──────────────────────┘ │
│ Services        [＋ Add] │  SectionHeader + button → Dialog
│ ┌──────────────────────┐ │
│ │ Haircut   $40  ●On ⋯ │ │  ListItem: name, price(tabular), Switch, overflow
│ │ Massage   $90  ●On ⋯ │ │
│ │ Old svc   $30  ○Off ⋯│ │  inactive = muted + Inactive badge
│ └──────────────────────┘ │
├──────────────────────────┤
│ [＋Income][Svc][Stat][Imp]│
└──────────────────────────┘

Add/Edit  → Dialog (bottom sheet on mobile)
┌──────────────────────────┐
│ Add service          ✕   │
│ Name   [____________]    │  ≤100 chars
│ Price  [ $______ ]       │  > 0
│ [ Cancel ] [  Save   ]   │
└──────────────────────────┘
```

- **Components:** Settings `Card` (commission number Field, currency `Select`, info `Alert`),
  Services `List` with `Switch` (active) + overflow `Dropdown` (Edit/Delete), `Dialog`/bottom
  sheet form, `Badge` for Inactive.
- **Behavior:** add/edit/deactivate persist and update the list immediately (TanStack Query
  invalidation). Inactive services drop out of the income picker but keep history. Commission
  and currency changes apply to **new** entries only — the info Alert states this explicitly.
- **States:** loading (list skeleton) · empty ("No services yet — add your first to start
  logging") · error (Retry) · validation errors inline in the Dialog.

### 5.4 Stats

```
┌──────────────────────────┐
│ TopBar  Stats         ⊙  │
├──────────────────────────┤
│ ┌─StatCard─┐┌─StatCard─┐ │
│ │ All time ││ This mo. │ │  display/mono-num, tabular
│ │ $4,210   ││ $620 ▲   │ │
│ └──────────┘└──────────┘ │
│ ┌─StatCard──────────────┐│
│ │ Services this month 7 ││
│ └───────────────────────┘│
│ Income over time         │  SectionHeader
│ [ Week | ●Month | Year ] │  Tabs (default Month)
│ ┌──────────────────────┐ │
│ │   ▁▃▅█▆▇  bar/line    │ │  Recharts, chart-1
│ └──────────────────────┘ │
│ Income by service        │
│ ┌──────────────────────┐ │
│ │     ◕ donut   total  │ │  Recharts pie, chart-1..6
│ │  ● Haircut  $1,800 43%│ │  legend: name · total · %
│ │  ● Massage  $1,400 33%│ │
│ └──────────────────────┘ │
├──────────────────────────┤
│ [＋Income][Svc][Stat][Imp]│
└──────────────────────────┘
```

- **Components:** three `StatCard`s (all-time total, this month, services-logged-this-month),
  `Tabs` period toggle, bar/line `Chart`, donut pie `Chart` + legend.
- **Behavior:** period Tabs re-aggregate the over-time chart (pure `groupByPeriod`); pie uses
  `groupByService`. New entries appear on next view. (`CLAUDE.md` keeps these aggregations as
  pure, unit-tested functions.)
- **States:** loading (stat-card + chart skeletons) · **empty** (single EmptyState "No income
  yet — your charts appear once you log entries") · error (Retry).
- **Desktop:** stat cards in a 3-up row; the two charts side-by-side at `lg`.

### 5.5 Import

```
┌──────────────────────────┐
│ TopBar  Import        ⊙  │
├──────────────────────────┤
│ ┌── Dropzone ──────────┐ │
│ │   ⬆  Drop CSV here   │ │  drag-drop / tap; file-up icon
│ │   or tap to browse   │ │
│ └──────────────────────┘ │
│ Preview · 12 rows        │  SectionHeader (after parse)
│ ┌──────────────────────┐ │  Table → stacked cards on mobile
│ │ Jun 1 Haircut  $40 ✓ │ │
│ │ Jun 2 ???      $90 ⚠ │ │  invalid row: red bg + reason
│ │   ⚠ Unknown service  │ │
│ └──────────────────────┘ │
│ 10 valid · 2 with notes  │  summary line
│ [ Import 10 entries  ]   │  primary, sticky bottom bar
├──────────────────────────┤
│ [＋Income][Svc][Stat][Imp]│
└──────────────────────────┘

Result
┌──────────────────────────┐
│   🎉  Imported 10 entries │  success Alert/EmptyState
│   2 rows had unknown svc  │
│   [ View income ]        │
└──────────────────────────┘
```

- **Flow:** **Upload → Preview → Confirm → Result.** Detect format by extension (`.csv`),
  parse (PapaParse), validate each row with Zod into `ImportRow`.
- **Components:** `Dropzone` (custom), preview `Table` (stacked on mobile) with invalid rows
  in `--color-negative-subtle` bg + inline reason, sticky confirm `Button`, success
  `Alert`/EmptyState result.
- **Behavior:** invalid rows are highlighted with their error but **don't block** valid rows.
  On confirm, valid rows bulk-insert: match `service_name` to existing services
  (case-insensitive), apply **current** `commission_pct`, set `source = 'import'`; unknown
  service names insert with `service_id = null` but still import. Imported entries show up in
  Log Income and Stats.
- **States:** idle (dropzone only) · parsing (skeleton) · preview (table + counts) ·
  importing (button spinner) · done (result) · parse error (Alert "Couldn't read this file").

---

## 6. Patterns & guidance

### 6.1 Money formatting
- Format with `Intl.NumberFormat(locale, { style: 'currency', currency })` using the profile
  currency. Always render figures with `tabular-nums`. Right-align money in tables/lists.
- `amount_earned` is display-only of a **stored snapshot** — never recompute from current
  price/commission. Zero is `$0.00` in `fg-muted`, not hidden. Positive earnings may use
  `--color-positive`; never rely on color alone (pair with a label/sign).

### 6.2 Forms
- react-hook-form + Zod everywhere; one `Field` per input. Errors are inline, specific, and
  appear on blur/submit. Primary action disabled until the form is valid; shows a spinner
  while submitting. Destructive deletes use optimistic update + **Undo** toast (or a confirm
  Dialog for irreversible ones).

### 6.3 The loading / empty / error triad
Every TanStack Query view ships all three: a **Skeleton** matching the final layout,
an **EmptyState** with a CTA, and an **ErrorState** with Retry. No bare spinners on full
screens where a skeleton communicates structure better.

### 6.4 Accessibility checklist (WCAG 2.1 AA)
- **Contrast (verified pairs):** `fg` on `bg` ≈ 13.8:1; `fg-muted` on `bg` ≈ 5.9:1;
  `fg-subtle` on `bg` ≈ 4.6:1; `primary-fg` on `primary` ≥ 4.5:1 (both modes). Large text/UI ≥ 3:1.
- **Focus:** every interactive element has a visible `--color-ring` focus-visible state.
- **Targets:** ≥44×44px; spacing prevents mis-taps.
- **Semantics:** labels tied to controls; `aria-invalid`/`aria-describedby` on errors; Radix
  supplies roles/keyboard/focus-trap for overlays, tabs, select.
- **Color is never the only signal:** pair with icon/text (e.g. Inactive badge + muted style;
  invalid import row + ⚠ reason).
- **Motion:** honor `prefers-reduced-motion` (disable chart/overlay animations).

### 6.5 Responsive strategy
Mobile-first. Bottom tab bar < `md`, sidebar ≥ `md`. Content max-widths (640 forms / 1024
data). Tables collapse to stacked cards on mobile. Single source of truth: same components,
layout adapts via utilities.

### 6.6 PWA & mobile
- Respect `env(safe-area-inset-*)` on the tab bar and bottom sheets (`viewport-fit=cover` is
  already set).
- Keep `<meta name="theme-color">` matched to the active mode — light `oklch(0.985 0.003 250)`
  / dark `oklch(0.165 0.02 264)` — updated alongside the `.dark` toggle, with `media`-scoped
  fallbacks. (The current manifest uses a single slate `#0f172a`; revisit so the installed
  status bar matches each theme.)
- Standalone display already configured; ensure first paint applies the theme (see §2.3).

---

## 7. Implementation appendix

> Reference for whoever wires this up next — **nothing here is applied in this doc.**

### 7.1 Paste targets
- **`src/index.css`** — replace the bare `@import 'tailwindcss';` with the full block from
  [§2.2](#22-color--semantic-tokens-light--dark) (import + `@custom-variant` + `@theme` +
  `.dark`).
- **`index.html`** — add the Inter stylesheet/font and the pre-paint theme script
  ([§2.3](#23-system-preference-bootstrap)); plan the per-mode `theme-color` ([§6.6](#66-pwa--mobile)).

### 7.2 Suggested `src/components/ui/` files
```
ui/Button.tsx        ui/Field.tsx        ui/Input.tsx       ui/Textarea.tsx
ui/Select.tsx        ui/Switch.tsx       ui/Checkbox.tsx    ui/Card.tsx
ui/StatCard.tsx      ui/List.tsx         ui/Table.tsx       ui/Badge.tsx
ui/Dialog.tsx        ui/Sheet.tsx        ui/DropdownMenu.tsx ui/Tabs.tsx
ui/Toast.tsx         ui/Alert.tsx        ui/Skeleton.tsx    ui/Spinner.tsx
ui/EmptyState.tsx    ui/ErrorState.tsx   ui/AppShell.tsx    ui/TabBar.tsx
ui/ThemeToggle.tsx   ui/chart/theme.ts   (Recharts token config)
```
These map 1:1 to [§4](#4-component-library). Keep them presentational (no Supabase/query
logic) per `CLAUDE.md` — feature screens compose them.

### 7.3 Dependencies to add later (optional, documented only)
```bash
# Icons + accessible primitives (shadcn/ui foundation)
npm i lucide-react \
  @radix-ui/react-dialog @radix-ui/react-select \
  @radix-ui/react-dropdown-menu @radix-ui/react-tabs \
  @radix-ui/react-toast @radix-ui/react-switch @radix-ui/react-checkbox

# Inter (self-hosted variable font)
npm i @fontsource-variable/inter   # or load via <link> from a font CDN
```
**Rationale:** Radix gives WCAG-grade keyboard/focus/ARIA behavior for free while we keep full
Tailwind styling ownership (no MUI lock-in); lucide is a clean, tree-shakeable icon set; Inter
brings the tabular figures finance UIs need. All are optional — the system degrades to the
system font stack and hand-rolled controls if a dependency is declined.

### 7.4 `CLAUDE.md` alignment
- **Tailwind-only styling** preserved — components use utilities + token variables, **no
  inline styles, no CSS modules**.
- **Recharts-only** — §4.8 themes Recharts; no other charting lib introduced.
- **Single Supabase client / TanStack Query / react-hook-form + Zod** unaffected — this layer
  is purely presentational and sits under `src/components/ui/`.
- **`calc.ts` stays React- and style-free** — the "You earn" preview and money formatting call
  it but live in feature components.

---

## 8. Sources

Researched June 2026.

**Tailwind v4 tokens & theming**
- Tailwind CSS — Theme variables / `@theme`: <https://tailwindcss.com/docs/theme>
- Mavik Labs — Design Tokens That Scale (Tailwind v4 + CSS variables): <https://www.maviklabs.com/blog/design-tokens-tailwind-v4-2026/>
- MatchKit — Design Tokens for Tailwind v4: <https://www.matchkit.io/blog/design-tokens-tailwind-v4>

**Fintech UX & visual best practice**
- ProCreator — Best Fintech UX Practices for Mobile Apps (2026): <https://procreator.design/blog/best-fintech-ux-practices-for-mobile-apps/>
- The Skins Factory — Fintech UI/UX Design Best Practices (2026): <https://www.theskinsfactory.com/uiux-design-blog/fintech-ui-ux-design>
- G&CO — Best UX Design Practices for Finance Apps (2026): <https://www.g-co.agency/insights/the-best-ux-design-practices-for-finance-apps>

**Component-library approach (shadcn/Radix vs alternatives)**
- Tailkits — Base UI vs shadcn/ui vs Radix UI: <https://tailkits.com/blog/base-ui-vs-shadcn-ui-vs-radix-ui-comparison/>
- Calmops — shadcn/ui vs Radix UI vs MUI: <https://calmops.com/programming/web/component-libraries-shadcn-radix-mui/>

**Typography & tabular money**
- Bootcamp/Medium — Elements of Fintech Typography: Readable Money: <https://medium.com/design-bootcamp/the-elements-of-fintech-typography-part-1-readable-money-b6c1226acbde>
- Datawrapper — Which fonts to use for charts and tables: <https://blog.datawrapper.de/fonts-for-data-visualization/>
