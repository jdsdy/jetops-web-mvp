# Landing page styling

Conventions for the public landing page at `/`. The goal is a clean, professional aviation look: restrained layout, high contrast typography, and minimal motion.

## Files

| File | Purpose |
| --- | --- |
| `app/page.tsx` | Landing page sections and content data |
| `components/landing-header.tsx` | Site header and primary CTA styles |
| `components/landing-footer.tsx` | Site footer |
| `app/layout.tsx` | Public Sans font, global body classes, favicon metadata |
| `app/globals.css` | Tailwind theme tokens and landing animations |

Shared landing chrome (`LandingHeader`, `LandingFooter`) lives in `/components` because it is used across the page layout, not scoped to a single route subdirectory.

## Typography

- **Font:** Public Sans via `next/font/google`, exposed as `--font-public-sans` and applied with `font-sans` on `body`.
- **Base body:** `text-neutral-900` on a white background.

### Eyebrow labels

Small section labels above headings:

```
text-sm font-medium tracking-wide text-aviation-blue uppercase
```

Examples: “Flight briefing intelligence”, “How it works”, “Supported platforms”.

### Split headings

Headlines use **contrasting weight and colour** within one line. Lead with emphasis; trail with lighter secondary text.

| Level | Size | Pattern |
| --- | --- | --- |
| Hero (`h1`) | `text-4xl sm:text-5xl leading-tight` | `font-bold text-neutral-900` + `font-light text-neutral-500` |
| Section (`h2`) | `text-3xl leading-tight` | `font-bold text-neutral-900` + `font-light text-neutral-400` |
| Card (`h3`) | `text-lg font-semibold text-neutral-900` | Single weight |

### Body copy

- Primary: `text-base leading-relaxed text-aviation-slate`
- Secondary / card copy: `text-sm leading-relaxed text-aviation-slate`
- Header tagline: `text-xs text-aviation-slate`

### Brand name in header

```
text-sm font-bold tracking-wide text-neutral-900 uppercase
```

## Colour palette

Defined in `app/globals.css` `@theme` and used via Tailwind utilities:

| Token | Hex | Use |
| --- | --- | --- |
| `aviation-navy` | `#0f2744` | Footer text links |
| `aviation-blue` | `#1a4d8f` | Eyebrows, step numbers, link hover target |
| `aviation-slate` | `#5c6b7a` | Body and supporting text |

Neutrals come from Tailwind’s `neutral` scale:

- **Borders:** `border-neutral-200` (header/footer use `border-neutral-200/80` where softer)
- **Section backgrounds:** alternate `bg-white` and `bg-neutral-50`
- **Primary CTA:** `bg-neutral-900` with `hover:bg-neutral-800`

Do not introduce new accent colours on the landing page without adding them to `@theme` first.

## Layout

- **Content width:** `max-w-6xl mx-auto`
- **Horizontal padding:** `px-6`
- **Section vertical padding:** `py-16` (hero uses `py-20`)
- **Page shell:** `body` is `flex min-h-full flex-col`; `main` is `flex-1`

### Hero

- Full viewport height minus header: `min-h-[calc(100vh-4.5rem)]`
- Background image: `bg-cover bg-right bg-no-repeat` via `bg-[url('/hero_bg2.png')]`
- Left readability gradient: `bg-gradient-to-r from-white via-white/55 to-white/10`
- Text block: `max-w-xl`; supporting paragraph `max-w-md`
- Decorative layers use `aria-hidden`

### Content grids

Three-column content at `sm:grid-cols-3` with `gap-8` and `mt-12` below section intros.

## Section patterns

Sections are separated with `border-t border-neutral-200` and alternate background:

1. **Hero** — image background with gradient overlay
2. **How it works** — `bg-neutral-50`; numbered list items with `border-t border-neutral-200 pt-6`
3. **Supported platforms** — `bg-white`; bordered cards (`border border-neutral-200 bg-neutral-50 p-6`)

Section intros use `max-w-2xl`. Optional supporting paragraph below the `h2` uses `mt-4`.

### Platform / logo cards

- Logo container: `h-14` with `object-contain object-left`
- Image sizing: `h-10 w-auto max-w-[160px]`
- Always set a meaningful `alt` on partner logos

## Buttons and links

### Primary CTA (Sign in)

Shared class exported as `signInClassName` from `components/landing-header.tsx`:

```
inline-flex items-center justify-center rounded-sm bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800
```

Use this for header and hero sign-in actions. Re-export rather than duplicating the class string.

### Footer text link

```
font-medium text-aviation-navy transition-colors hover:text-aviation-blue
```

### Footer disclaimer

Plain text below the footer tagline (`mt-3 text-sm text-aviation-slate`): closed testing phase notice; public use is not available.

## Motion

Animation is intentionally minimal. Only the hero uses entrance motion:

| Class | Effect |
| --- | --- |
| `animate-fade-up` | 0.7s fade + 12px upward translate |
| `animate-fade-up-delay` | Same, with 0.15s delay (hero CTA) |

Do not add scroll animations, hover transforms, or extra keyframes unless there is a clear layout reason.

## Assets (`public/`)

| Asset | Use |
| --- | --- |
| `logo_square.png` | Header, footer, favicon |
| `hero_bg2.png` | Hero background |
| `foreflight.png` | EFB platform card |
| `ozrunways.png` | EFB platform card |
| `naips.png` | EFB platform card |

Use `next/image` for logos. Mark the header logo `priority`.

## Adding new landing sections

1. Match the eyebrow + split `h2` intro pattern.
2. Alternate section background (`bg-neutral-50` ↔ `bg-white`).
3. Keep copy in data arrays at the top of `app/page.tsx` when the section is landing-only.
4. Promote reusable UI to `/components` only when it is shared across multiple routes or multiple top-level page files—not for single-section markup that only appears once on `/`.

## Out of scope (other passes)

The landing conventions above do not yet apply to `/auth`, onboarding, portal, or app routes. Reuse tokens and typography from `globals.css` when styling those surfaces in later passes.
