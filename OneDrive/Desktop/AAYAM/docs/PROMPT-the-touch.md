# Prompt — AAYAM "The Touch" hero + high-quality 3D wordmark

> Paste everything below the line into Claude Code (Opus) opened in `C:\Users\piyus\OneDrive\Desktop\AAYAM`.

---

You are a senior creative developer, WebGL/3D specialist and art director. You are **upgrading an existing, working website**, not starting over. The site is for **AAYAM, the annual technical fest of NIT Agartala, 13–15 November 2026**.

Before anything else, read the current codebase so you understand what exists. Read `README.md`, `docs/BUILD-CONTRACT.md`, `docs/aayam_website_spec.md`, `content/site.ts`, `app/globals.css` and everything in `components/**` and `app/**`. Look at every image in `docs/reference/` with your Read tool. Pay particular attention to `aayam-wordmark-reference.jpg`, which shows the ASCII hand above the molten wordmark.

## 0. What must not change

- **Stack:** Next.js 15 App Router, React 19, TypeScript strict, CSS Modules, `motion/react`, raw `three` with no R3F or drei. Use a single WebGL renderer and a single canvas for the whole Home page (`components/stage`).
- **Content:** only what is in `content/site.ts`. Do not invent events, guests, sponsors, venues, links or prices. No dead buttons.
- **Navigation:** exactly the seven items Home, About, Events, Guests, Schedule, Sponsors, Our Team, with the existing overlay and the six Coming Soon routes.
- **Design system:** Technoir × Chrome White × Liquid Metal. Use the design tokens in `app/globals.css`. Warm reds, oranges and golds belong only to the wordmark. Red, blue and cyan belong only to the 3D burst and the poster hairlines.
- **Engineering:** every quality bar in `docs/BUILD-CONTRACT.md` still applies. That includes reduced motion, keyboard access, contrast, no console errors, no hydration mismatches, and three.js lazy-loaded so it is never in the initial bundle.

## 1. The concept: "The Touch"

This is a nod to *The Creation of Adam*.

- An **ASCII hand**, the one from the reference artwork, reaches down from above.
- Below it waits the **liquid-chrome orb** that already exists.
- As the visitor scrolls, the hand descends and the orb's surface stretches up toward the fingertip.
- At the moment of **contact**, a chrome ripple runs across the orb. Molten metal pours off it and flows down into a **new high-quality 3D AAYAM wordmark**, filling each letter like metal poured into a mould.
- The hand then recedes into the atmosphere and the finished wordmark settles in as the hero.

One sentence of story: *the hand gives the spark, the chrome becomes AAYAM.*

## 2. Page structure — keep the three-screen format from elan.org.in

Elan's structure is:
1. A full-bleed hero with the logo, a description paragraph and CTA at bottom-left, a big date and countdown at bottom-right, and a fixed header.
2. A theme or statement screen.
3. A closing screen with information and a huge logo footer.

Keep that structure exactly as it is now, with these changes.

### Screen 1 — `#hero` becomes a pinned scroll scene

- **Structure:** a tall wrapper with `position: sticky` and a 100svh stage inside it. Use CSS sticky pinning, not JavaScript scroll-hijacking. Scroll stays native and the animation is scrubbed **both ways**, forward and backward.
- **Wrapper height — keep the intro short:** about **170svh on desktop and about 140svh on mobile**, so the whole Touch completes within roughly 0.7 (desktop) / 0.4 (mobile) extra screen-heights of scrolling. Expose this as one constant.
- **Smoothness is a hard requirement.** Every scrubbed value is damped toward its scroll target with frame-rate-independent smoothing (critically damped, or a lerp of about 0.12–0.18 per 60 fps frame), so motion glides and never steps, jitters or lags noticeably. Any time-based effect lasts **≤ 600 ms**. There is no boot sequence or loading wait: frame 0 already reads as a finished composition. No frame drops below the targets in §6.
- **Always visible from frame 0 and never hidden by the scene:**
  - the fixed header with its menu button;
  - the big `NOV 13–15` date with the countdown at bottom-right;
  - the `01/03` marker;
  - the scroll cue.
- **Revealed in the last phase:** the description paragraph and the "Explore events" CTA at bottom-left. They are always in the DOM; only their opacity and transform animate.
- **Skip link:** add a visible, keyboard-focusable "Skip intro" text link that jumps to the end of the scene. It should be subtle and mono, near the scroll cue.
- **When the scene ends,** the composition must look like a finished elan-style hero:
  - the 3D wordmark is dominant, centred;
  - the orb is smaller and sits above the wordmark, slightly overlapping its top;
  - the hand is a faint ASCII atmosphere at the top, at about 15% opacity, like the reference poster;
  - the description and CTA are at bottom-left, and the date and countdown at bottom-right.

### Screen 2 — `#core`

Keep the thin-line grid from the video, the chrome AAYAM and the pillars. The orb continues its existing morph into the red, blue and cyan **spiky burst** as this section scrolls in.

**Replace the current date poster with a "Spotlight" COMING SOON poster** (`components/home/SpotlightPoster.tsx`). It is based directly on the supplied poster reference `docs/reference/date-poster-reference.png` (GRAND / outlined 24 / NOV / RE OPENING):
- **Layout:** a tall portrait card (about 9:16) with a rounded dark frame and fine film grain. From top to bottom:
  - a hairline rule;
  - **COMING** in wide heavy caps (Archivo, wdth 125);
  - a thin-bordered box containing the outlined numerals **13—15** (stroke-only) and **NOV** in solid heavy caps beneath them;
  - the small label **NIT AGARTALA** (playing the role of the poster's small "RE");
  - **SOON** in wide heavy caps;
  - a stack of red→blue hairline stripes (`--signal-red` → `--signal-blue`);
  - a closing hairline.

  Everything is HTML/CSS/SVG, crisp at every size, using only confirmed content.
- **Spotlight:**
  - **On reveal:** a soft theatrical light cone (a CSS radial and conic gradient with a slight blur) sweeps down onto the card once, about 500 ms. The card surface then stays lit with a gentle vignette.
  - **On desktop (fine pointer):** the light follows the cursor subtly, with a damped highlight on the card surface and outlined numerals that catch a faint chrome sheen.
  - **On touch:** a slow ambient drift.
  - **With reduced motion:** a static lit state.
  - It must stay restrained and cinematic, never a disco light.
- **Countdown under the poster:** see the countdown rules below.
- **Accessibility:** the card has `aria-label="Coming soon: 13 to 15 November 2026, NIT Agartala"`, and its decorative parts are hidden.
- **Mobile:** the card sits right after the burst at full column width. A portrait card suits phones, so make it look intentional there.

**Countdown format, used everywhere** (the hero bottom-right and under the Spotlight poster; one shared component):
- It counts down to `site.dates.start` and shows **days, hours and minutes, followed by the word "LEFT"**. For example: `24 DAYS · 08 HOURS · 31 MINUTES LEFT`, with large tabular-figure numbers and small mono labels. Use the singular when the value is 1 (`1 DAY`, `1 HOUR`, `1 MINUTE`).
- Seconds are not shown. Update on the minute boundary. Re-sync on `visibilitychange` and do not drift.
- Render client-only after mount, with stable `--` placeholders of the same width (no hydration mismatch, no layout shift). Give it a static accessible label of "Starts 13 November 2026", and do not use aria-live per tick.
- **States:**
  - before the start: the countdown;
  - from start to end (IST): `LIVE NOW · DAY N OF 3`;
  - after the end: `AAYAM 2026 HAS CONCLUDED`.

### Screen 3 — `#explore`

Keep it unchanged, except that the large footer wordmark now uses the **new 3D-rendered wordmark still** (see §4.4), not the old 2D cut-out.

## 3. Scroll choreography for screen 1

Let `t` be the hero scroll progress from 0 to 1: `(scrollY − heroTop) / (heroHeight − innerHeight)`, clamped. Run all scrubbed motion through one `timeline.ts` that maps `t` to named phase values, using smoothstep or easing helpers. Use time-based easing only for the contact flash. Everything else follows `t`, so scrolling back up rewinds cleanly.

| `t` | Phase | What happens |
|---|---|---|
| 0.00–0.08 | **Arrival** | The ASCII hand hangs in the top third, partly cropped by the top edge, fingers pointing down, slowly breathing. The faint glyph brightness shifts and the fingers sway by a few pixels. The chrome orb sits in the lower-middle with idle ripples and cursor tilt. A **ghost outline of AAYAM** sits where the wordmark will be: an ASCII or hairline silhouette at about 8% opacity, the empty "mould". |
| 0.08–0.45 | **Reach** | The hand descends with a slight wrist rotation. Its glyphs brighten nearer the fingertip, and the index fingertip leads. A smooth chrome **tendril** rises from the top of the orb toward the fingertip. It is vertex displacement toward a target point, with radius tapering to a bead, and with liquid-metal surface tension, not rubber. The tendril gap closes as `t` rises. The cursor can still tilt the orb. |
| 0.45–0.52 | **Contact** | The fingertip and the bead meet. Fire a one-shot, time-based **contact event** of about 450 ms, re-armed only when the visitor scrolls back below 0.40:<br>• a chrome ripple ring travels across the orb (a shader uniform);<br>• the hand's glyphs near the fingertip flash once to warm gold (`--wordmark-gold`) and fade back;<br>• a soft white specular bloom appears at the contact point.<br>**No strobing.** It is a single ease-out, with no more than one flash. |
| 0.52–0.85 | **Pour** | The existing drip strands become streams. Several thin molten-chrome streams fall from the underside of the orb into the wordmark area, and their colour warms from chrome to molten red-gold as they fall. Each letter **fills from the bottom up**, staggered Λ → A → Y → A → M, through a height-based dissolve mask that has a thin glowing molten front. The ghost outline fades out as the real letters fill. The orb shrinks to its final hero size and drifts up into its final position. |
| 0.85–1.00 | **Settle** | Streams thin out and retract. The wordmark finishes with one slow specular sweep and starts its idle loop: slowly flowing highlights and a ±4–6° parallax tilt toward the cursor. The hand rises and fades to atmosphere. The description and CTA rise in. The scene unpins. |

**Hover and tap** keep working throughout:
- hovering the orb triggers the existing restrained drips;
- on touch devices, tapping the orb triggers a short drip;
- in the burst state, spikes flex toward the cursor.

## 4. The new high-quality 3D AAYAM wordmark

### 4.1 Art direction
Redesign the wordmark as a real 3D object, faithful to the reference letterforms: **Λ A Y A M**, with long tapered calligraphic sweeps and pointed hooked tips, like candied molten glass or liquid metal.

The material should be a deep magenta-red body (`--wordmark-magenta` / `--wordmark-red`) with:
- orange internal glow at the thin parts;
- **gold specular highlights** and a subtle thin-film iridescence on the rims;
- a glossy clearcoat;
- soft subsurface-like warmth (a fake transmission/thickness term is fine);
- dark mirrored pockets in the concave areas so it reads as sculpted, not flat.

It must look premium at 1920px and on DPR-2 phones, never plastic and never like a bevelled font.

### 4.2 Geometry pipeline (code-only, reproducible: `scripts/build-wordmark-3d.py`)
1. Start from the existing transparent cut-out `public/images/brand/aayam-wordmark@2x.png`, or a cleaner vector if the organisers supply one. Separate the five letters by connected components and order them left to right.
2. For each letter, compute a smooth 2D signed distance field from the alpha mask (`scipy.ndimage.distance_transform_edt`, then Gaussian smoothing). Build an **inflated "balloon" surface**: `height(x, y) = depth · sqrt(d / dmax)^p`, mirrored front and back. This gives round, tube-like molten strokes that taper naturally at thin tips.
3. Mesh it with marching cubes on a 3D occupancy volume (`skimage.measure.marching_cubes`) or by triangulating the height field. Then smooth it (Taubin or Laplacian, keeping volume) and compute smooth normals. Add a little noise-driven asymmetry so the strokes feel hand-made.
4. Export **one GLB containing five named meshes** (`L1_Lambda`, `L2_A`, `L3_Y`, `L4_A`, `L5_M`), each with:
   - a vertex attribute `fillHeight`, the normalised 0–1 height inside its letter, which drives the pour mask;
   - a `uv` suitable for a flow map.
5. Produce two levels of detail:
   - desktop, about 40–60k triangles in total;
   - mobile, about 12–18k triangles.
6. Compress with meshopt (`npx gltfpack -cc`, or the `meshoptimizer` CLI). Budgets: desktop GLB **≤ 350 KB**, mobile GLB **≤ 150 KB**. Write them to `public/models/aayam-wordmark.glb` and `public/models/aayam-wordmark-mobile.glb`.
7. Python dependencies: numpy, scipy, scikit-image, trimesh. Install them in a local venv under `scripts/.venv` (git-ignored) and document the exact commands in the README.
8. Keep the pipeline swappable. If a designer later supplies a Blender-made GLB with the same mesh names and `fillHeight` attribute, it must drop in with no code changes. Document this.

### 4.3 Runtime material (`components/stage/wordmark3d.ts`)
- Load the GLB with `GLTFLoader` and `MeshoptDecoder` from `three/examples/jsm`. No new npm dependencies.
- Use a custom `ShaderMaterial`, consistent with how the orb works today. Use an **analytic warm-studio environment** (no HDR files and no network requests):
  - dark sky, warm softboxes and a gold rim strip;
  - Fresnel, clearcoat, a thin-film hue shift on the rims, and a thickness-based orange glow;
  - a slowly rotating environment for "flowing" highlights.
- **Pour uniforms:** `uFill[5]` (per-letter fill level), `uFrontGlow` and `uFrontWidth`. Fragments above the fill level are discarded, and the fill front glows molten gold.
- Add the knobs to `components/stage/config.ts` under a new `wordmark3d` group: colours, glow, iridescence, tilt, fill stagger, front width and LOD thresholds. Comment every knob.

### 4.4 Renders that replace the old 2D wordmark everywhere
Render high-quality stills of the finished 3D wordmark from the live WebGL scene. Use a temporary capture mode at a high pixel ratio with `preserveDrawingBuffer`, then remove it when done. Produce transparent WebP/AVIF images about 1800 px wide.

Replace the following with these renders:
- `public/images/brand/aayam-wordmark@2x.webp`, the master used by `components/brand/Wordmark.tsx` in the header, the core section, the explore footer and the nav overlay;
- `aayam-wordmark@2x.png`, used by the Open Graph image;
- `aayam-wordmark.webp`, the hero sheen mask.

Also regenerate `app/icon.png` and `app/apple-icon.png` from the first letter. The `chrome` variant still uses its CSS silver filter on the new art. Keep the old 2D cut-outs in `docs/reference/legacy/`.

## 5. The ASCII hand

### Extraction (`scripts/extract-hand.py`)
- Take the hand from `docs/reference/aayam-wordmark-reference.jpg`: the bright, low-saturation glyph pixels above the wordmark, including the faint red and blue tinted regions.
- Turn it into a **glyph grid**. For each cell (about 6–8 px in the source), store x, y, brightness (0–255) and a tint class (white / red / blue).
- Also store the coordinates of the **index fingertip** and of the other four fingertips, so the code knows where contact happens.
- Write a compact binary `public/data/hand-glyphs.bin` (Uint16 or Uint8, ≤ 60 KB) plus a tiny JSON header. Do not ship the original JPG to the client.

### Rendering (`components/stage/hand.ts`)
- Draw the hand **inside the same WebGL renderer** as instanced glyph quads, in one draw call, sampling a small mono-glyph texture atlas generated at runtime from JetBrains Mono on a 2D canvas.
- Each glyph's character is chosen by brightness from a ramp, for example ` .:-=+*#%@`.
- **Animation:**
  - very subtle per-glyph flicker;
  - finger sway, driven by a per-finger rigid offset weighted by the distance from the knuckle line;
  - the descent and wrist rotation follow `t`;
  - fingertip brightening happens on approach;
  - a gold flash ripples outward from the fingertip at contact.
- The hand's dotted drip lines from the reference become **falling glyph streams** during the Pour phase. This visually links the hand, the orb and the letters.
- Keep the glyph count around 3–6k on desktop and about 1.5–2.5k on mobile (use larger cells there). If this actor fails, fall back to a 2D canvas.

## 6. Mobile-first requirements

- **Design the portrait composition deliberately; do not crop the desktop one.**
  - Hand: across the top 35% of the screen.
  - Orb: centred at about 48% of the height.
  - Wordmark: fills the area from about 62–80% of the height, at roughly 90vw.
  - Date and countdown: compact row at the bottom.
  - Description and CTA: appear below during Settle and may extend past the first screen after the unpin.
- Use `svh`/`lvh`/`dvh` correctly so the iOS and Android address bar never makes the pinned stage jump. Test that sticky pinning and the pin height behave in iOS Safari and Android Chrome.
- **Touch behaviour:**
  - nothing needs hover;
  - tapping the orb drips;
  - touch-move tilts the orb gently;
  - the hand idles autonomously;
  - the scroll scrub must feel smooth with native momentum scrolling. Smooth the scroll value toward its target with a little lerp — about 0.15 per frame — and never block touch scrolling.
- **Device tiers:** reuse and extend `components/stage/tier.ts`.

  | Tier | Model | Pixel ratio | Glyphs | Hand |
  |---|---|---|---|---|
  | High | desktop LOD | up to 2 | full count | animated |
  | Mid | mobile LOD | up to 1.5 | reduced | animated |
  | Low | mobile LOD | up to 1.25 | reduced | **static glyph frame** |

  On the low tier, the pour streams are simplified to 2–3 and the droplets are off. Keep the existing adaptive pixel-ratio step-down.
- **Measured performance targets:**
  - 60 fps on a mid-range laptop iGPU;
  - at least 45 fps on a mid-range Android (Snapdragon 7-series class);
  - LCP ≤ 2.5 s on throttled "Fast 4G";
  - CLS ≈ 0;
  - Home First Load JS ≤ 170 kB, with all 3D code lazy-loaded;
  - total hero asset weight on mobile ≤ 1.2 MB.

## 7. Fallbacks, accessibility, reduced motion

- **Reduced motion:**
  - no pin: the hero collapses to a normal 100svh screen;
  - no scrub animation: the **final settled frame** renders statically, with the hand as atmosphere, the orb, and the completed 3D wordmark;
  - no flash and no streams;
  - hover and tap do not drip.
- **No WebGL2, a failed import, or a lost context:** show a static, pre-rendered **final-frame composite**. That is `public/images/stage/hero-final.webp` plus a mobile crop, captured from the live scene. Show it inside the hero anchor with no pin. The rest of the site must work normally.
- **Loading:** before the 3D code loads, show the static composite or ghost state immediately, so text, date and menu never wait for 3D. Cross-fade to live WebGL once the first frame is ready, with no layout shift.
- **Accessibility:**
  - one `h1` remains: the wordmark, with the accessible name "AAYAM", plus visually-hidden "— NIT Agartala's annual technical fest";
  - the canvas stays `aria-hidden` with `pointer-events: none`;
  - the skip-intro link is focusable;
  - the visual focus order matches the DOM;
  - no information is conveyed only by the animation;
  - contrast stays AA, including text over the animated background (use `--glass` behind body text where needed).
- Pause rendering when the tab is hidden or nothing is visible. Dispose everything on unmount, and make sure it is safe under StrictMode.

## 8. Files (suggested)

- **New:**
  - `components/stage/timeline.ts` (maps `t` to phase values);
  - `components/stage/hand.ts`;
  - `components/stage/wordmark3d.ts`;
  - `components/stage/pour.ts` (streams and fill coordination);
  - `components/stage/shaders/wordmark.ts`;
  - `components/stage/shaders/glyph.ts`;
  - `scripts/extract-hand.py`;
  - `scripts/build-wordmark-3d.py`;
  - `public/models/*.glb`;
  - `public/data/hand-glyphs.bin`;
  - `public/images/stage/hero-final*.webp`.
- **Modified:**
  - `components/stage/scene.ts` (adds actors, the tendril, the contact ripple, and the hero anchor for the wordmark: `[data-stage-anchor="wordmark"]`);
  - `components/stage/config.ts`;
  - `components/stage/ChromeStage.tsx`;
  - `components/home/HeroSection.*` (pinned wrapper, sticky stage, skip link, ghost outline, phase-driven reveal of the description and CTA via a CSS variable `--hero-t` that the stage or a small hook writes);
  - `components/home/ExploreSection.*`;
  - the brand images;
  - `README.md` (new how-tos: re-running both scripts, swapping in a designer GLB, tuning the `wordmark3d` and timeline knobs, and changing the pin length).

## 9. How to run the work: Opus subagents plus one verifier

Split the work across **Opus subagents** with strict file ownership, and run them in parallel where possible.

1. **Asset agent:** `scripts/**`, `public/models/**`, `public/data/**`. Produces the GLBs (both levels of detail, with `fillHeight`), `hand-glyphs.bin` with the fingertip data, and a short report of the actual file sizes.
2. **Stage agent:** `components/stage/**` and `public/images/stage/**`. Builds the timeline, hand, tendril, contact, pour and 3D wordmark actors; the tiers and fallbacks; and the renders.
3. **Home agent:** `app/page.*`, `components/home/**`. Builds the pinned hero, the mobile composition, the skip link, the ghost outline, the phase-driven reveals and the explore footer swap.
4. **Verifier agent:** reviews everything and sends concrete corrections to each owner, as `file:line`, the fix and a severity. It loops until there are no blockers or major issues, then finalises the minor ones itself.

**Process rules learned from the last build:**
- Each agent runs its own dev server with `NEXT_DIST_DIR=.next-<agent>` on its own port. Never touch the lead's `.next` folder or port 3000. Never run `next build` except the verifier, who uses `.next-verify`.
- Kill your own servers by PID when done and delete your dist folder. Revert Next's automatic edits to `tsconfig.json` and `next-env.d.ts`.
- If the browser pane is hidden, `requestAnimationFrame` will not fire. Stub it from the console (`requestAnimationFrame = cb => setTimeout(() => cb(performance.now()), 16)`) for visual checks only, and say so in the report.
- Check at 1440×900, 1920×1080, 768×1024, 375×812 and 360×740:
  - screenshot each phase: `t` = 0, 0.3, 0.5, 0.7, 1;
  - confirm no horizontal overflow at any size, including on the fallback path;
  - confirm there are no console errors.

## 10. Acceptance criteria (the verifier marks each PASS or FAIL with evidence)

- [ ] The three-screen elan structure is intact: hero → core grid with burst → explore + footer. The header, menu, date, countdown and scroll cue are usable at every moment of the scene.
- [ ] Scrolling performs **The Touch**: the hand reaches, the tendril rises, contact gives one ripple and gold flash, the pour fills the letters Λ→M bottom-up, and the scene settles. Scrolling back up rewinds it cleanly.
- [ ] The 3D wordmark is faithful to the reference letterforms, looks premium at 1920 and on DPR-2 mobile, and its renders replace the old 2D wordmark everywhere, including the OG image and favicon.
- [ ] The ASCII hand is recognisably the reference hand, with crisp glyphs, one draw call and the fingertip contact point correct.
- [ ] Mobile has its own portrait composition. Pinning is stable in iOS and Android browsers, touch works with no hover requirement, and there is no overflow.
- [ ] The intro is **short and smooth**: the pin is about 170svh on desktop and about 140svh on mobile, all scrubbed values are damped, no time-based effect runs longer than 600 ms, and there is no visible stepping or jitter at any viewport.
- [ ] The Spotlight COMING SOON 13—15 NOV poster faithfully echoes the poster reference, its spotlight is restrained (cursor-following on desktop, ambient drift on touch, static under reduced motion), and it looks intentional on mobile.
- [ ] The countdown reads `NN DAYS · NN HOURS · NN MINUTES LEFT` (singular forms when 1, no seconds), ticks on the minute, has no hydration mismatch or layout shift, and switches correctly to the live and concluded states.
- [ ] Performance targets in §6 are met, or the measured numbers are reported with the reason.
- [ ] Reduced motion and the WebGL-failure path show the static final frame, with no pin and full functionality.
- [ ] Nothing is invented. Seven menu items. Coming Soon routes unchanged. `tsc`, `eslint` and `next build` are clean. three.js is not in the initial bundle.
- [ ] The README is accurate for every new script, knob and asset-swap path.

Make the design decisions yourself rather than asking about minor preferences. Ask only if something in §0 would have to be broken.
