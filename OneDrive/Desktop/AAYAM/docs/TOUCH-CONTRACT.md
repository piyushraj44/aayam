# "The Touch" — team contract (round 3 build)

The brief is `docs/PROMPT-the-touch.md`. Read all of it, plus `docs/BUILD-CONTRACT.md` (whose rules still apply) and `lib/touchScene.ts` (the shared constants and helpers, owned by the lead). This file pins the **interfaces** so that three agents can build in parallel.

## Ownership
| Agent | Owns (edit only these) |
|---|---|
| **Asset** | `scripts/**` (except the existing `extract-wordmark.py`, which you may read and reuse), `public/models/**`, `public/data/**` |
| **Stage** | `components/stage/**`, `public/images/stage/**`. At the very end of your work: the new renders that replace `public/images/brand/aayam-wordmark@2x.webp`, `aayam-wordmark@2x.png` and `aayam-wordmark.webp` (move the old ones to `docs/reference/legacy/`), plus `app/icon.png` and `app/apple-icon.png` |
| **Home** | `app/page.tsx`, `app/page.module.css`, `components/home/**` (including the new `SpotlightPoster` and the countdown changes) |
| **Lead** | `lib/**`, `app/globals.css`, `content/site.ts`, `components/brand/**`, configs, `package.json`, `README.md` (the lead merges README updates from your final reports — put README text in your report) |

Dependencies are installed. That includes **`gltfpack`** (a dev dependency; run it with `npx gltfpack`), plus three's `GLTFLoader` and `meshopt_decoder.module.js` under `three/examples/jsm`. Add no other npm packages. **Python:** use `C:\Users\piyus\anaconda3\python.exe`, which has numpy, scipy and scikit-image. `trimesh` is missing; create `scripts/.venv` with `python -m venv --system-site-packages scripts/.venv` and `pip install trimesh` into it, or write the GLB yourself (a minimal glTF 2.0 writer is fine). `scripts/.venv` must be git-ignored; the lead will add the ignore line.

## Asset → Stage: file formats (MUST match exactly)
### `public/models/aayam-wordmark.glb` (desktop) and `public/models/aayam-wordmark-mobile.glb`
- glTF 2.0 binary, meshopt-compressed with gltfpack (`-cc`). Five mesh nodes, named exactly `L1_Lambda`, `L2_A`, `L3_Y`, `L4_A`, `L5_M`, in left-to-right order.
- **Units:** the whole wordmark is **2.0 units wide**, centred at the origin. +Y is up and +Z faces the viewer. Total depth (front to back) is about 0.18–0.28.
- **Attributes:** `POSITION`, `NORMAL` (smooth), `TEXCOORD_0` (a flow-map UV, roughly the planar XY projection normalised per letter), and **`TEXCOORD_1.x` = fillHeight**: 0 at the letter's lowest point and 1 at its highest, normalised per letter. `.y` = normalised distance from the stroke centreline (0 = centre, 1 = surface edge), used for the thickness glow. In three.js these arrive as the `uv1` attribute.
- **Verify** that both TEXCOORD sets survive gltfpack (quantisation is fine; check after loading). Do not let gltfpack merge the five nodes: use `-kn`, or keep names with `-km`, and verify.
- **Budgets:** desktop ≤ 350 KB (about 40–60k triangles), mobile ≤ 150 KB (about 12–18k triangles).
- **Look:** an inflated "balloon" or tube surface that tapers naturally into sharp, hooked tips, faithful to the reference letterforms. There must be no stair-stepping from the pixel mask (super-sample the mask and smooth), no holes and no non-manifold edges.

### `public/data/hand-glyphs.json` and `public/data/hand-glyphs.bin`
- **JSON:**
  - `{ version: 1, cols, rows, count, aspect, fingertips: [{ name: "index"|"middle"|"ring"|"little"|"thumb", x, y }], knuckleY, contactFinger: "index" }`
  - `x` and `y` are cell coordinates, measured in cells from the top-left of the hand grid.
  - `aspect` = the source cell's width ÷ height (the glyph grid's aspect).
  - `knuckleY` = the row of the knuckle line (finger sway weights grow below it).
  - `contactFinger` = the fingertip lowest in the image (pointing down), which leads the descent.
- **BIN:** `count` records of 4 × Uint8: `[col, row, brightness 0–255, tint 0=white|1=red|2=blue]`. Must be ≤ 60 KB. Include the hand's dotted drip lines as their own records with tint 0.
- **Also write** `public/images/stage/hand-fallback.webp` (the Stage agent owns this folder, but the Asset agent may write this one file): a crisp re-render of the glyph grid in light silver on transparent, about 1200 px wide.

**Deliver first drafts of all of these early** (target within your first ~25 minutes), even if rough, so the Stage agent can integrate. Then refine them and overwrite the same paths. Report each update in your final report.

## Stage ↔ Home: DOM contract
- Home renders `<section id="hero" data-touch-scene>`. The wrapper's height is `TOUCH_PIN_SVH.desktop` svh, or `.mobile` svh below `TOUCH_MOBILE_MAX` px, **except** under `@media (prefers-reduced-motion: reduce)` or `html[data-touch="static-gl"]` / `html[data-touch="fallback"]`, where it is 100svh with no pin.
- Inside it is a `position: sticky; top: 0; height: 100svh` stage element holding all hero content and these **anchors**. Each anchor is `aria-hidden`, has `position: relative` and an explicit size, and gives its **final settled** box:
  - `[data-stage-anchor="hand"]`: the hand's settled box near the top. The stage animates the hand from above this box to its reach position on its own.
  - `[data-stage-anchor="hero"]`: the orb's **settled** position and size (above the wordmark, slightly overlapping its top). During Arrival and Reach the stage may place the orb lower, nearer the wordmark area, on its own.
  - `[data-stage-anchor="wordmark"]`: the box where the 3D wordmark settles. Its width is the wordmark width (about 2.0 units maps to the box width), and its height matches the wordmark aspect (about 2.0 : 0.71 for the current art).
  - `[data-stage-anchor="core"]` in `#core`: unchanged.
- **Progress:** both sides compute `t = heroProgress(wrapperEl, innerHeight)` and smooth it with `damp(current, target, 0.15, dt)` from `lib/touchScene.ts`. Home writes the smoothed value to the CSS variable `--hero-t` on the wrapper, using a tiny client hook with a passive scroll listener and a rAF that stops when the value settles. Home uses it to reveal the description and CTA, fade the ghost outline, and fade in its fallback wordmark image while loading. The stage uses its own copy for the 3D.
- **State:** the stage sets `document.documentElement.dataset.touch` to `"live"`, `"static-gl"` or `"fallback"`, as defined in `lib/touchScene.ts`. Before that the attribute is absent, which means "loading". Home CSS reacts:
  - **live / static-gl:** Home's own wordmark `<img>` inside the `h1` gets `opacity: 0`. Keep it in the DOM for the accessible name.
  - **fallback:** the image is fully visible and there is no pin.
  - **loading:** the image's opacity follows `--hero-t` in the Pour range (0.52 → 0.85), so scrolling still "produces" AAYAM before WebGL is ready.
- **Skip intro:** Home's link scrolls to the end of the pin (`#hero-end`, an element placed at the wrapper's bottom). Use instant scrolling under reduced motion.
- The ghost "mould" outline of AAYAM (the empty letters at about 8% opacity) is Home's job. Build it with the wordmark alpha as a CSS mask and a hairline/ASCII texture, positioned exactly over `[data-stage-anchor="wordmark"]`.
- The stage must never block interaction (`pointer-events: none`) and must never draw over header, date or countdown text in a way that hurts readability.

## Shared rules
- Each agent runs its own dev server: Asset 3121 (if needed), Stage 3122, Home 3123. Start each with `NEXT_DIST_DIR=.next-<agent> npx next dev -p <port>` (bash, in the background).
  - **When done:** kill your own node processes by PID (`Get-CimInstance Win32_Process` and filter on your port in the command line), delete `.next-<agent>`, and revert Next's automatic edits. `tsconfig.json`'s `include` must be exactly `["**/*.ts","**/*.tsx",".next/types/**/*.ts","next-env.d.ts"]`, and `next-env.d.ts` must reference `./.next/types/routes.d.ts`.
  - Never touch `.next`, port 3000 or other agents' servers. Only the verifier runs `next build`.
- **Browser:** create your own tab with `mcp__Claude_Browser__tabs_create` and close it when done. If the pane is hidden, stub `requestAnimationFrame` from the console for screenshots, say so in your report, and reset the viewport afterwards.
- **Checks:** `npx tsc --noEmit` and `npx eslint <your paths>` must be clean. No console output, no `any`, no hydration mismatches, StrictMode-safe, and everything disposed on unmount.
