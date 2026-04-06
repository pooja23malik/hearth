# Design System — Hearth

## Product Context
- **What this is:** Family task management app with AI-powered weekly insights
- **Who it's for:** Families of 2-5 people managing recurring household tasks together
- **Space/industry:** Family productivity, household management
- **Project type:** Mobile-first web app (PWA)
- **Identity:** "It knows our family." Hearth is a family companion, not a productivity tool. The design should feel like your kitchen counter, not your office desk.

## Aesthetic Direction
- **Direction:** Organic Minimal
- **Decoration level:** Intentional — subtle warmth through off-white backgrounds, soft shadows, and gentle color shifts. No decoration for its own sake.
- **Mood:** Warm, grounded, intimate. Like a handwritten note on the fridge. Personal enough to feel like it was made for your family specifically, clean enough to stay out of the way.
- **Reference sites:** Homsy (gethomsy.com) for family-app positioning, but Hearth is warmer and less techy.

## Typography
- **Display/Hero:** Fraunces — warm serif with personality. Used for headings, the digest hero number, onboarding prompts ("What matters most?"). No other family task app uses a serif. This is Hearth's visual signature.
- **Body:** DM Sans — clean, readable, pairs beautifully with Fraunces. Used for task titles, descriptions, metadata, body text.
- **UI/Labels:** DM Sans (same as body) — section labels, tab labels, button text
- **Data/Tables:** DM Sans with `font-variant-numeric: tabular-nums` — alignment percentages, task counts, dates
- **Code:** JetBrains Mono — for any technical content (environment variables, etc.)
- **Loading:** Google Fonts CDN
  ```html
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,600;0,9..144,700;1,9..144,400&family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  ```
- **Scale:**
  - Hero/Display: 48px (Fraunces 700)
  - H1: 36px (Fraunces 600)
  - H2: 24px (Fraunces 600)
  - H3: 18px (Fraunces 600)
  - Body: 15px (DM Sans 400)
  - Small: 13px (DM Sans 400)
  - Micro: 11px (DM Sans 600, uppercase, letter-spacing 1px) — section labels, tags
  - Code: 13px (JetBrains Mono 400)

## Color
- **Approach:** Restrained — one accent color does all the work. Warm neutrals replace cold grays.
- **CSS Variables:**

```css
@theme {
  /* Core */
  --color-bg-primary: #FAFAF8;        /* warm off-white */
  --color-bg-card: #FFFFFF;            /* card surface */
  --color-text-primary: #1A1A1A;       /* near-black */
  --color-text-secondary: #7A7068;     /* warm gray (shifted from cold #6B6B6B) */

  /* Accent */
  --color-accent: #2B8A8A;             /* teal — the anchor */
  --color-accent-hover: #237272;       /* darker teal */

  /* Semantic */
  --color-success: #4A9B6D;            /* green */
  --color-warning: #C4944A;            /* warm amber */
  --color-danger: #D4604A;             /* warm red */

  /* Badges */
  --color-badge-recurring: #D4E8EC;    /* light teal */
  --color-badge-personal: #E8D4EC;     /* light purple */

  /* Digest — alignment bars */
  --color-alignment-on-track: #2B8A8A; /* teal (≥70%) */
  --color-alignment-slipping: #C4944A; /* amber (40-69%) */
  --color-alignment-gap: #D4604A;      /* red (<40%) */

  /* Digest — gap callout */
  --color-gap-bg: #FEF3F0;
  --color-gap-border: #E8C5BC;
  --color-gap-text: #8A4A3A;

  /* Digest — insight cards */
  --color-insight-border: #2B8A8A;
  --color-insight-tag-bg: #D4E8EC;
  --color-insight-tag-text: #2B8A8A;

  /* Digest — streak celebration */
  --color-streak-bg: #F0F8F4;
  --color-streak-text: #3A7A5A;

  /* Values onboarding — chips */
  --color-chip-selected-bg: #2B8A8A;
  --color-chip-unselected-border: #D0D0D0;
}
```

- **Dark mode strategy:** Reduce saturation by 10-20%, lighten accent colors slightly, use warm dark backgrounds (#1A1917 primary, #262523 card surface). See preview page for full dark palette.

## Spacing
- **Base unit:** 4px
- **Density:** Comfortable — not cramped, not airy. A family app checked while making coffee.
- **Scale:** 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 (px)
- **Section padding:** 16px horizontal (container), 48px vertical (between sections)

## Layout
- **Approach:** Grid-disciplined, single-column, mobile-native
- **Container:** `max-w-2xl` (672px) centered with `px-4` (16px) padding
- **Grid:** Single column for all viewports (mobile-first, no complex responsive breakpoints)
- **Max content width:** 672px
- **Border radius:**
  - Small (inputs, code blocks): 4px (`--radius-sm`)
  - Medium (alerts, tags): 8px (`--radius-md`)
  - Large (buttons, form inputs): 12px (`--radius-lg`)
  - XL (cards, modals): 16px (`--radius-xl`)
  - Full (chips, badges, avatars): 9999px (`--radius-full`)

## Shadows
- **Default:** `0 1px 3px rgba(26,26,26,0.06)` — task cards, cards
- **Medium:** `0 4px 12px rgba(26,26,26,0.08)` — modals, elevated elements
- **None on interactive elements** — buttons use color change, not shadow lift

## Motion
- **Approach:** Minimal-functional — gentle, never bouncy
- **Easing:** enter `ease-out`, exit `ease-in`, move `ease-in-out`
- **Duration:** micro 100ms, short 200ms, medium 300ms, long 500ms
- **Patterns:**
  - New content appears: `fadeIn` (opacity 0→1, translateY -4px→0, 200ms ease-out)
  - State transitions: `transition: all 0.2s` on interactive elements
  - Loading: shimmer animation on skeleton placeholders
  - Completion celebration: existing keyframe animation (preserved)
  - Digest insights streaming in: fade-in per card as SSE delivers them

## Component Patterns

### Task Card
White bg, rounded-xl, subtle shadow, flex row with checkbox + content + meta. 14px horizontal padding, 14px vertical.

### Value Chip (onboarding)
Pill shape (full radius), 10px/20px padding, 1.5px border. Unselected: gray border + secondary text. Selected: teal bg + white text with gentle scale animation on tap.

### Alignment Bar
Flex row: value name (100px) + progress bar (flex-1, 8px height, full radius) + percentage (36px, tabular-nums). Bar color follows alignment thresholds.

### Gap Callout Card
Warm amber bg (#FEF3F0), amber border (#E8C5BC), dark amber text (#8A4A3A). 14px padding, lg radius. Contains 1-2 sentences, never judgmental.

### Insight Card
White bg, teal border (1.5px #2B8A8A), lg radius, 14px padding. Contains observation text + type tag (Observation/Suggestion/Streak). Type tag uses micro text style with badge-recurring bg.

### Digest Hero
Centered, Fraunces 700 at 64px for the percentage number in teal. Week date range above in secondary text. "X of Y tasks completed" below in body text.

## Accessibility
- Focus-visible outline: 2px solid accent, 2px offset (already exists)
- Touch targets: 44px minimum for all interactive elements
- Color contrast: all text/bg combinations meet WCAG AA
- Alignment bars include percentage text (colorblind-safe, not color-only)
- Value chips: `role="checkbox"` with `aria-checked`
- Digest sections: `role="region"` with `aria-label`

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-05 | Initial design system | Created by /design-consultation. Organic minimal aesthetic, Fraunces + DM Sans typography, warm teal palette. |
| 2026-04-05 | Fraunces serif for display | No family task app uses a serif. This makes Hearth visually distinct and warm. ~50KB font load. |
| 2026-04-05 | Warm gray shift (#6B6B6B → #7A7068) | Removes cold edge from secondary text. Shifts all grays 5 degrees warm. |
| 2026-04-05 | Restrained color approach | One accent (teal) does all the work. Semantic colors (success/warning/danger) only appear for status. |
