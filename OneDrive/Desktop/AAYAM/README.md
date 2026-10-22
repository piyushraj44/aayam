# AAYAM — website

The official website for **AAYAM**, the annual technical fest of NIT Agartala (13–15 November 2026).

The first release is the identity and shell of the site:

- A three-part **Home** page (`/`): the molten AAYAM wordmark, a cursor-responsive liquid-chrome object rendered with WebGL that morphs into a chromatic "burst" as you scroll, the date card with a live countdown, and an index of the other sections.
- A full-screen **navigation overlay** with exactly seven destinations: Home, About, Events, Guests, Schedule, Sponsors, Our Team.
- A shared **Coming Soon** state on `/about`, `/events`, `/guests`, `/schedule`, `/sponsors` and `/team`, plus a matching 404 page.
- Basic SEO plumbing: per-route metadata, `robots.txt`, `sitemap.xml` and a generated Open Graph image.

There is no backend, database, form or tracking. No events, guests, sponsors, team members, venues, prices or registration links are published yet — add them only once the organisers confirm them (see [Adding content to a Coming Soon page](#adding-content-to-a-coming-soon-page-later)).

---

## Stack

| | |
|---|---|
| Framework | [Next.js 15](https://nextjs.org/) (App Router), React 19 |
| Language | TypeScript (strict) |
| Styling | CSS Modules + global design tokens in `app/globals.css` |
| Motion | [`motion`](https://motion.dev/) (`motion/react`) for the navigation overlay and the Home scroll reveals (`components/home/Reveal.tsx`); CSS for everything else |
| 3D | [`three`](https://threejs.org/) (raw three.js with custom shaders, no React Three Fiber), loaded lazily on the Home page only |
| Fonts | Archivo (variable, incl. the width axis) and JetBrains Mono via `next/font/google` (self-hosted at build time) |
| Social image | `next/og` (`ImageResponse`) |

## Requirements

- **Node.js ≥ 18.18** (tested with Node 24)
- npm (a `package-lock.json` is committed)

## Setup

```bash
npm install          # install dependencies
npm run dev          # start the dev server on http://localhost:3000
npm run build        # production build
npm start            # serve the production build (after npm run build)
npm run lint         # eslint . (flat config in eslint.config.mjs: next/core-web-vitals + next/typescript)
npm run typecheck    # TypeScript, no emit
```

`next.config.ts` reads an optional `NEXT_DIST_DIR` environment variable for the build output folder (default `.next`). It only exists so several dev servers can run side by side, e.g. `NEXT_DIST_DIR=.next-alt npx next dev -p 3001`. You don't need it normally.

## Deployment

The site is a standard Next.js app — every route is statically generated, so it runs anywhere Next.js runs:

- **Vercel**: import the repository; no configuration needed beyond the environment variable below.
- **Any Node host**: `npm ci && npm run build && npm start` (set `PORT` to change the port).

Set **`NEXT_PUBLIC_SITE_URL`** to the final public origin (e.g. `https://aayam.example.org`, no trailing slash) **at build time**. It is used for canonical URLs, Open Graph URLs, `robots.txt` and `sitemap.xml`. On Vercel, if it is not set, `https://$VERCEL_PROJECT_PRODUCTION_URL` (the project's production domain) is used; anywhere else they fall back to `http://localhost:3000`.

Direct loads and refreshes of every route (`/about`, `/team`, …) work out of the box because each route is a real page; unknown URLs render the 404 page.

## Project structure

```text
app/
  layout.tsx              Root layout: fonts, global metadata, skip link, header, <main id="main">
  globals.css             Design tokens (colours, type scale, spacing, motion, z-index) + base styles
  page.tsx                Home (hero → core → explore)
  about/ events/ guests/ schedule/ sponsors/ team/
    page.tsx              Each renders <ComingSoon sectionName="…"/> and exports its metadata
  not-found.tsx           404 page
  _lib/sectionMetadata.ts Shared per-route metadata (title, description, canonical, Open Graph / Twitter titles)
  robots.ts               /robots.txt
  sitemap.ts              /sitemap.xml (generated from navItems)
  opengraph-image.tsx     1200×630 social preview (molten wordmark + date line)
  icon.png, apple-icon.png

components/
  brand/Wordmark.tsx      The AAYAM wordmark artwork (molten or chrome variant)
  shell/                  SiteHeader, NavigationOverlay, SiteFooter
  ui/ChromeLink.tsx       Shared link/button (outline + ghost variants)
  coming-soon/            ComingSoon (route placeholder) and StatusScreen (shared with 404)
  home/                   Home page sections (hero, core, explore, countdown, date poster, …)
  stage/                  The WebGL chrome object (ChromeStage, scene, shaders, config.ts)

content/
  site.ts                 All approved copy, dates and the navigation items

public/images/
  brand/                  Wordmark exports (aayam-wordmark@2x.webp/.png, aayam-wordmark.webp)
  stage/                  Static fallback images for the 3D object

docs/
  aayam_website_spec.md   Full design & development specification
  BUILD-CONTRACT.md       Implementation contract used while building the first release
  reference/              Reference artwork (wordmark, chrome orb, burst frames, date poster)

scripts/
  extract-wordmark.py     Cuts the wordmark out of the reference JPG (see below)
```

---

## How-to

### Replacing the reference assets

- **Brand artwork** lives in `public/images/brand/`:
  - `aayam-wordmark@2x.webp` — the master used by the site (`components/brand/Wordmark.tsx` imports it statically, so Next.js knows its size and generates responsive variants).
  - `aayam-wordmark@2x.png` — the same image as PNG; read from disk and embedded by `app/opengraph-image.tsx`.
  - `aayam-wordmark.webp` — the 1× export. The Home hero uses it as the CSS mask for the chrome sheen that sweeps across the molten wordmark (`components/home/HeroSection.tsx`), so its shape must match the master exactly.
- **Reference images** in `docs/reference/` are design references only; nothing in the app imports them.
- **`scripts/extract-wordmark.py`** was used to cut the current wordmark out of `docs/reference/aayam-wordmark-reference.jpg` onto a transparent background. It separates the warm, saturated letter pixels from the grey ASCII dots, keeps only large connected shapes, un-premultiplies the edges, crops, and writes all three files above:

  ```bash
  pip install pillow numpy scipy
  python scripts/extract-wordmark.py docs/reference/aayam-wordmark-reference.jpg public/images/brand
  ```

  The crop box (`y0, y1, x0, x1`) is hard-coded for that 1536×1078 reference image. If you run it on different artwork, adjust the crop first — or, better, skip the script and export the official wordmark directly (next section).

### Updating the wordmark

1. Export the official wordmark with a **transparent background**, roughly **1700 px wide**, tightly cropped.
2. Replace **all three** files in `public/images/brand/` together, keeping the file names:
   - `aayam-wordmark@2x.webp` — the master rendered everywhere by `Wordmark.tsx`;
   - `aayam-wordmark@2x.png` — embedded in the Open Graph image;
   - `aayam-wordmark.webp` — the 1× copy used as the mask for the hero sheen.

   They must stay identical in artwork, crop and aspect ratio. If only some are replaced, the hero sheen mask no longer lines up with the visible wordmark, and link previews show the old artwork.
3. If the aspect ratio changed, update `WORDMARK_W` / `WORDMARK_H` in `app/opengraph-image.tsx`.
4. Restart the dev server so the static image import picks up the new dimensions.

The current master was cut out of the reference JPG and upscaled 2× by `scripts/extract-wordmark.py`, so its edges are softer than a true high-resolution file. Ask the organisers for an official high-resolution (or vector) export of the wordmark and swap it in as soon as it is available (spec §18).

The wordmark is always artwork, never typed text. `components/brand/Wordmark.tsx` renders it in two variants: `molten` (original colours — hero, footers) and `chrome` (the same artwork turned liquid-silver with a CSS filter in `Wordmark.module.css` — header, menu, Coming Soon). Tune the chrome look by editing that `filter`.

### Adjusting the chrome material and liquid-leak intensity

Everything about the 3D object is tuned in **`components/stage/config.ts` → `stageConfig`** (the file header has a quick guide). Save the file and the dev server hot-reloads the scene. Lengths are relative to the orb radius, angles are radians, speeds are per second. Current default values and per-knob comments are in the file itself.

| Group | Knobs | What they do |
|---|---|---|
| `chrome` | `brightness`, `contrast`, `stripIntensity`, `floorBrightness`, `specular`, `tint` | Orb material: exposure, depth of the black reflections, softbox highlights, floor reflection, key-light hotspot, base reflectance (linear RGB) |
| `ripple` | `amplitude`, `frequency`, `speed`, `hoverBoost`, `burstAmount` | Liquid surface wobble, extra wobble on hover, how much remains in the burst state |
| `drip` | `intensity` (**0 disables drips**), `strandCount`, `length`, `beadRadius`, `neckRadius`, `rootWidth`, `droplets` | The liquid-metal "leak": hanging strands on hover and the droplets that detach (droplets are skipped on low-tier devices) |
| `burst` | `scale`, `spikeCount`, `spikeLength`, `lengthVariance`, `coreRadius`, `spikeWidth`, `taper`, `petalBulge`, `sway`, `pointerFlex`, `spin`, `dispersion`, `gain`, `palette` | Size and shape of the chromatic burst: `scale` is its on-screen size relative to the orb (>1 lets the spikes bleed across the grid lines); `dispersion` controls the colour fringes; `palette` reads `--signal-red` / `--signal-blue` from `globals.css` (with fallbacks) plus a cyan defined only here |
| `pointer` | `smoothing`, `maxTilt`, `reflectionShift`, `hoverRadius`, `idleMotion` | How the object follows the cursor / touch and its idle motion |
| `render` | `dprCap`, `detail`, `adaptiveFrameMs`, `minDpr`, `fovDeg` | Per-device-tier pixel-ratio caps and mesh detail, automatic resolution step-down, camera FOV |
| `scroll` | `morphStart`, `morphEnd`, `exitDistance`, `exitShrink` | When the orb→burst morph happens between the hero and core sections, and how it fades out in the explore section |

Device tiers (`high` / `mid` / `low`) are detected in `components/stage/tier.ts`.

### Regenerating the hero assets (ASCII hand + 3D wordmark)

The hand glyph grid and the 3D wordmark are generated from the reference art by scripts in `scripts/`. They need Python with numpy, scipy, scikit-image, Pillow and matplotlib; the Anaconda install on the build machine has all of them, so no venv is needed. Run the commands from the repo root.

- **ASCII hand** → `public/data/hand-glyphs.{json,bin}` and `public/images/stage/hand-fallback.webp`:

  ```bash
  python -I scripts/extract-hand.py docs/reference/aayam-wordmark-reference.jpg public/data public/images/stage/hand-fallback.webp --preview <tmpdir>
  ```

  It measures the glyph pitch, samples brightness and tint (white / red / blue) per cell, and finds the five fingertips (`contactFinger` is the lowest one, which leads the touch), the knuckle line and the dotted drip lines. `--preview` writes a side-by-side check image.

- **3D wordmark** → `public/models/aayam-wordmark.glb` (desktop, ~45k triangles, ≤ 350 KB) and `aayam-wordmark-mobile.glb` (~16k triangles, ≤ 150 KB):

  ```bash
  python -I scripts/build-wordmark-3d.py docs/reference/legacy/aayam-wordmark-2d@2x.png public/models
  node scripts/verify-glb.mjs public/models/aayam-wordmark.glb
  node scripts/verify-glb.mjs public/models/aayam-wordmark-mobile.glb
  ```

  The source is the **legacy 2D cut-out**, not the brand file (which is now a render of the 3D wordmark). The build takes about 3 minutes and runs `npx gltfpack` itself. Tuning flags: `--zscale`, `--back`, `--noise`, `--fair`, `--fair-tip-radius`, `--voxel`, `--taubin`, `--desktop-tris`, `--mobile-tris`, `--no-pack`. For previews: `node scripts/verify-glb.mjs <glb> --dump x.bin && python -I scripts/preview-wordmark.py x.bin <outdir>`.

#### Swapping in a designer-made GLB (e.g. from Blender)

A designer GLB drops in with no code changes if it matches this contract:

- **Meshes:** five mesh objects named exactly `L1_Lambda`, `L2_A`, `L3_Y`, `L4_A`, `L5_M`, in left-to-right order. Each named node should be the mesh itself; apply all transforms (Ctrl+A) so the nodes have identity transforms.
- **Scale and axes:** the whole wordmark is 2.0 units wide, centred at the origin, with +Y up and +Z towards the viewer, and about 0.2 deep. The glTF exporter's "+Y Up" option does this.
- **UV maps:**
  - `TEXCOORD_0` (UV map 1): planar XY per letter, 0..1.
  - `TEXCOORD_1` (UV map 2): x = fillHeight (0 at the letter's lowest point, 1 at its highest); y = distance from the stroke centreline (0 at the centre, 1 at the edge).
  - three.js receives them as `uv` and `uv1`.
- **Geometry:** smooth normals and closed, manifold meshes.
- **Compression:** `npx gltfpack -i in.glb -o public/models/aayam-wordmark.glb -cc -ce ext -kn -kv -vpf -vtf -vn 10`. Add `-si <ratio>` to hit the triangle budget, and repeat with a smaller ratio for the mobile file. `-kv` keeps both UV sets, and `-vpf -vtf` keep the named nodes as plain meshes with float UVs.
- **Check:** run `node scripts/verify-glb.mjs` on both files and make sure there are no FAIL lines.

### Changing dates / copy

All fest copy lives in **`content/site.ts`**:

- `site.description`, `site.shortDescription` — used on Home and in metadata.
- `site.dates` — `start`/`end` are ISO timestamps in IST (the countdown targets `start`); `rangeShort`, `dayStart`, `dayEnd`, `month`, `monthLong`, `year` are the display strings used across the header, menu, Coming Soon pages, OG image and Home.
- `site.url` — comes from `NEXT_PUBLIC_SITE_URL` (then Vercel's `VERCEL_PROJECT_PRODUCTION_URL`, then `http://localhost:3000`).
- `navItems` — the seven menu destinations (label, route, `ready` flag).

Don't hard-code fest copy in components; add a field here instead. Some Home-specific microcopy lives in `components/home/copy.ts`.

### Adding content to a Coming Soon page later

1. Keep the route. Open `app/<route>/page.tsx` (e.g. `app/events/page.tsx`) and replace `<ComingSoon sectionName="…" />` with the real page components. Keep (or refine) the exported `metadata` and make sure the page still has exactly one `<h1>`.
2. In `content/site.ts`, set `ready: true` for that item in `navItems`. This removes the "Coming soon" tag in the navigation overlay and in the Home explore index, and changes its sitemap `changeFrequency`.
3. Put the data in its own file under `content/`, e.g. `content/events.ts`, typed per spec §11.1:

   ```ts
   export type FestEvent = {
     slug: string;
     title: string;
     category: string;
     description: string;
     date?: string;
     startTime?: string;
     endTime?: string;
     venue?: string;
     eligibility?: string;
     teamSize?: string;
     registrationUrl?: string;
     status: "coming-soon" | "open" | "closed";
   };

   export const events: FestEvent[] = [
     // Only organiser-confirmed entries. Leave optional fields out rather than guessing.
   ];
   ```

4. External links (registration forms etc.):
   - Link straight to the official HTTPS destination — no internal redirect endpoints.
   - Use `ChromeLink` (`components/ui/ChromeLink.tsx`): any `http(s)://` href automatically gets `target="_blank" rel="noopener noreferrer"` and a visually hidden "(opens in a new tab)" note.
   - Use meaningful labels (`REGISTER`, `VIEW EVENT DETAILS`) and show registration status as separate text. If registration isn't open or the URL isn't confirmed, render no button at all — never a dead or disabled-looking CTA.

### Design tokens

`app/globals.css` defines every colour, font, type size, spacing value, easing/duration and z-index layer as CSS variables on `:root`. Components only reference these variables — change a token there and it updates everywhere.

- Surfaces: `--void-black` (page), `--deep-black`, `--obsidian` (menu), `--gunmetal`.
- Text/chrome: `--chrome-white`, `--liquid-silver`, `--steel-grey` (the lowest-contrast colour allowed for text; it was lifted from the spec's `#727B86` to `#8A929C` for AA contrast).
- Wordmark-only accents (`--wordmark-*`) and chromatic accents for the burst/date poster only (`--signal-red`, `--signal-blue`).
- Lines: `--line`, `--line-strong`; glass: `--glass`.
- Type: `--font-sans` (Archivo), `--font-mono` (JetBrains Mono), width axis values `--wdth-condensed: 62` / `--wdth-normal` / `--wdth-wide`, fluid sizes `--fs-micro` … `--fs-h1`.
- Layout & motion: `--gutter`, `--header-h`, `--ease-out`, `--ease-in-out`, `--dur-fast|med|slow`.
- Layers: `--z-stage` (3D canvas) < `--z-content` < `--z-header` < `--z-overlay` (menu).

The condensed display style is `font-variation-settings: "wdth" var(--wdth-condensed)` with a heavy weight (800).

### Accessibility & reduced motion

- Document order: skip link → `<header>` (site header, a banner landmark) → `<main id="main">`. Page footers (the Home closing footer, the Coming Soon / 404 footer) are `<footer>` elements **inside** `<main>`, so they are not separate contentinfo landmarks. One `<h1>` per page. On Coming Soon pages the heading reads e.g. "About — Coming soon".
- The header menu button is labelled "Open navigation" and exposes `aria-expanded` / `aria-controls`; all controls are at least 44×44 px.
- The navigation overlay is a modal dialog (`role="dialog"`, `aria-modal="true"`, labelled "Site navigation"): focus moves to the Close button on open, Tab/Shift+Tab stay inside, Escape closes, focus returns to the menu button, page scrolling is locked (`body[data-scroll-locked="true"]`, with scrollbar-width compensation) and the header, skip link and `#main` are made `inert` while it is open. The current page is marked with `aria-current="page"` and a visible "Current" label, not colour alone. Choosing Home while on `/` closes the menu and scrolls to the top.
- A visible chrome-white focus ring is defined globally (`:focus-visible`).
- Text colours meet WCAG AA on the black background; decorative imagery uses empty `alt`.
- `prefers-reduced-motion: reduce` is respected everywhere: a global rule in `globals.css` cuts CSS animations/transitions; the menu switches to a short opacity fade; ChromeLink hover sweeps become a plain colour change; the Coming Soon chrome sheen and droplet stop; smooth scrolling is turned off; the 3D stage renders single static frames instead of a continuous loop and disables hover drips.

### Performance notes

- three.js and the shaders are **not** in the initial bundle: `ChromeStage` dynamically imports the scene after the page is idle, only on the Home page. Without WebGL 2 (or if the context fails / is lost) static fallback images from `public/images/stage/` are shown inside the layout anchors instead.
- The render loop pauses when the tab is hidden or the object is off-screen, caps the device pixel ratio per device tier, and steps the resolution down automatically if frames get slow (`stageConfig.render`).
- The 3D canvas is fixed, `pointer-events: none` and sized independently of the layout, so it never blocks clicks or causes layout shift.
- Coming Soon and 404 pages are pure server-rendered HTML + CSS (no 3D, no extra client JS beyond the shared header).
- Images go through `next/image` (AVIF/WebP, responsive sizes). Fonts are self-hosted by `next/font` with `display: swap`.
- The Open Graph image is generated at build time from the local PNG and a bundled font — no network access needed.
