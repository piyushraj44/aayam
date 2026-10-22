# AAYAM web — build contract (for all builder agents)

Project root: `C:\Users\piyus\OneDrive\Desktop\AAYAM` — Next.js 15 App Router, React 19, TypeScript (strict), CSS Modules, `motion` (import from `"motion/react"`), `three` (raw three.js, no R3F/drei). Dependencies are already installed. **Do not add dependencies**; if you truly need one, say so in your final report instead.

Read first: `docs/aayam_website_spec.md` (full spec), `app/globals.css` (design tokens — use the CSS variables, never hard-code new colours), `content/site.ts` (all copy/dates/routes — never hard-code fest copy elsewhere), `components/brand/Wordmark.tsx`.

Reference images (look at them with your Read tool):
- `docs/reference/aayam-wordmark-reference.jpg` — molten wordmark + ASCII/pixel figure atmosphere (Image 1)
- `docs/reference/liquid-chrome-orb-reference.jpg` — liquid-chrome orb material (Image 2)
- `docs/reference/burst-animation-frame.png` + `burst-animation-contact-sheet.png` — frames of the user's video: a dark glossy spiky "star-burst" 3D object with red / blue / cyan chromatic rim reflections, slowly rotating, framed by a thin-line grid layout with the text "FUTURE FASHION". The user wants this **integrated (not replicated)** into our landing page as an interactive element, with the text being **AAYAM**.
- `docs/reference/date-poster-reference.png` — poster: thin rules, wide grotesk caps, a framed box with outlined numerals, red/blue hairline stripes. Inspiration for our date card.

## Confirmed content (do not invent anything beyond this)
- Fest: AAYAM, NIT Agartala's annual technical fest. Dates 13–15 November 2026 (IST). Description in `site.description`.
- No events, guests, sponsors, team, venue, prices, social links, contact details or registration links exist yet. Do not fabricate any. No dead buttons — every link must go to a real route.
- Menu: exactly Home, About, Events, Guests, Schedule, Sponsors, Our Team (`navItems`). Routes: `/`, `/about`, `/events`, `/guests`, `/schedule`, `/sponsors`, `/team`.

## Page structure — Home is a three-"page" vertical scroll (inspired by elan.org.in)
1. `#hero` (≥100svh) — molten AAYAM wordmark (dominant), liquid-chrome **orb** (3D), subtle ASCII/pixel atmosphere behind, bottom-left fest description + "Explore events" link (→ `/events`), bottom-right big date `NOV 13–15` + live countdown, scroll cue, index marker `01/03`.
2. `#core` (≥100svh) — the video-inspired **thin-line grid frame**. The 3D object morphs from the chrome orb into the **chromatic spiky burst** as this section scrolls in. Left panels: chrome-variant AAYAM wordmark (instead of "FUTURE FASHION"), a short line built only from the description's own words (competitions · performances · workshops), a "Discover" link → `/about`. Right panels: date poster card (from the poster reference: NIT AGARTALA / outlined `13—15` in a box / NOV / 2026 / red-blue hairlines) and an "Explore events" link. Marker `02/03`.
3. `#explore` — elan's closing section analogue: "Explore" index of the six other destinations as large condensed rows with thin dividers + "Coming soon" tags, then a big molten wordmark footer with `© 2026 AAYAM · NIT Agartala`. Marker `03/03`. The 3D object eases out (fades/shrinks) here.

## Layering
- `ChromeStage` = one fixed, full-viewport `<canvas>` at `z-index: var(--z-stage)`, `pointer-events: none` (it must never block clicks/scroll/selection). Rendered once on the Home page only.
- All page content sits above it at `var(--z-content)`; header at `var(--z-header)`; nav overlay at `var(--z-overlay)`.
- Section backgrounds must be transparent where the 3D object shows through (body is already `--void-black`).

## Stage ↔ layout contract (Home agent ⇄ Stage agent)
- Home places empty, sized placeholder elements: `<div data-stage-anchor="hero" />` inside `#hero` and `<div data-stage-anchor="core" />` inside `#core`. Each anchor has explicit CSS size (square-ish box) where the object should appear. Anchors must be `aria-hidden="true"` and have `position: relative`.
- Stage reads the anchors' `getBoundingClientRect()` (on scroll/resize/rAF) and places + scales the object so its visual diameter ≈ the anchor's smaller side, interpolating smoothly between anchors by scroll position. Morph value 0 = chrome orb (hero), 1 = chromatic burst (core). Past `core` (in `#explore`) it fades/shrinks out and the render loop stops while nothing is visible.
- Reduced motion: Stage keeps WebGL but draws a single static frame (no loop, no drips), redrawn only on scroll/resize (lead decision, round 2).
- If WebGL is unavailable / fails / context is lost, Stage renders its own fallback **inside each anchor** (React portal into the anchor element): a static image/CSS chrome orb in hero and a static burst-ish chrome visual in core. Home must not render its own fallback.
- Stage import: `import { ChromeStage } from "@/components/stage/ChromeStage";` used as `<ChromeStage />` (no props needed). ChromeStage is a client component that dynamically imports the three.js code so it is not in the initial bundle.

## Shell contract (Shell agent)
- `components/shell/SiteHeader.tsx` exports `SiteHeader` (already imported by `app/layout.tsx`). Fixed header: small chrome AAYAM mark (link to `/`, accessible name "AAYAM home"), optional centred mono line `NIT AGARTALA · 13–15 NOV 2026` on ≥768px, and the menu trigger (accessible name "Open navigation", ≥44px target).
- `components/shell/NavigationOverlay.tsx` — full-screen overlay per spec §6 + Reference: thin dividers, condensed uppercase labels (Archivo wdth 62), mono index numbers, chrome-white highlights, "Coming soon" tag for non-ready items, `aria-current="page"` for the active route, focus trap, Escape closes, scroll lock (`body[data-scroll-locked="true"]`), focus returns to trigger, background `inert`. Home link closes the overlay and scrolls to top when already on `/`.
- `components/coming-soon/ComingSoon.tsx` — `type ComingSoonProps = { sectionName: string; description?: string }`, used by all six routes.
- `components/shell/SiteFooter.tsx` — small footer (`© 2026 AAYAM · NIT Agartala`, back-to-top) used by Coming Soon pages and 404. The Home `#explore` section has its own bigger footer composition (Home agent).
- `components/ui/ChromeLink.tsx` — reusable restrained link/button (thin silver border, chrome sweep on hover/focus). Home agent uses it too, so Shell agent must create it FIRST (within your first few minutes) with this API:
  `type ChromeLinkProps = { href: string; children: React.ReactNode; variant?: "outline" | "ghost"; arrow?: boolean; className?: string } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href">` — wraps `next/link`.
- Routes, metadata per route (`export const metadata = { title: "About" }` etc.), `app/not-found.tsx`, `app/robots.ts`, `app/sitemap.ts`, `app/opengraph-image.tsx` (next/og, can embed the wordmark PNG read from disk), README.

## File ownership (edit only your own files)
| Agent | Owns |
|---|---|
| Stage (3D) | `components/stage/**`, `public/images/stage/**` |
| Home | `app/page.tsx`, `app/page.module.css`, `components/home/**`, `public/images/home/**` |
| Shell | `app/layout.tsx` (only if needed), `components/shell/**`, `components/ui/**`, `components/coming-soon/**`, `app/{about,events,guests,schedule,sponsors,team}/**`, `app/not-found.tsx`, `app/robots.ts`, `app/sitemap.ts`, `app/opengraph-image.tsx`, `README.md` |
| Lead (orchestrator) | `app/globals.css`, `content/site.ts`, `components/brand/**`, configs, `package.json` |

Need a token or a content field that doesn't exist? Use a local CSS variable/constant in your own files and list the request in your final report.

## Quality bar
- TypeScript strict, no `any`, no unused code, no console output, no hydration mismatches (time-dependent UI renders after mount).
- Mobile-first; no horizontal overflow at 360px; touch targets ≥44px; works at 360×740, 768×1024, 1440×900, 1920×1080.
- `prefers-reduced-motion` respected everywhere. Keyboard reachable, visible focus, semantic landmarks/headings (one `h1` per page).
- Contrast: body text ≥ 4.5:1 on black (use `--chrome-white`, `--liquid-silver`, `--steel-grey`; never darker for text).
- Check your work: `npx tsc --noEmit` and `npx eslint <your files>`. Do NOT run `next build` (the verifier does it). For visual checks run your own dev server with a separate dist dir and port so agents don't collide, e.g. in bash: `NEXT_DIST_DIR=.next-stage npx next dev -p 3101` (Stage 3101, Home 3102, Shell 3103) in the background, and use the browser tools if you have them. Stop your server when done.
