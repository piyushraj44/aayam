/**
 * ============================================================================
 *  AAYAM Stage — tunables for the 3D liquid-chrome object on the Home page
 * ============================================================================
 *
 *  Everything you might want to tweak about the look and feel of the orb /
 *  burst lives in `stageConfig` below. Change a value, save, and the dev
 *  server hot-reloads the scene. No shader knowledge needed.
 *
 *  Quick guide
 *  -----------
 *  - Orb too dark / too flat?      chrome.brightness, chrome.contrast
 *  - Highlights too strong/weak?   chrome.stripIntensity, chrome.specular
 *  - Bottom reflection (floor)?    chrome.floorBrightness
 *  - Surface wobble?               ripple.amplitude / frequency / speed
 *  - Hover drips?                  drip.intensity (0 disables), drip.strandCount
 *  - Burst petals?                 burst.spikeCount / spikeLength / spikeWidth
 *  - Colour fringes on the burst?  burst.dispersion
 *  - Burst colours?                burst.palette (reads the CSS tokens first)
 *  - Cursor feel?                  pointer.smoothing / maxTilt
 *  - Performance?                  render.dprCap / render.detail
 *  - Hero "Touch" choreography?    touch.* (orb start pose, tendril, contact, pour)
 *  - ASCII hand?                   hand.* (opacity, sway, flicker, glyph budget)
 *  - 3D wordmark material / pour?  wordmark3d.* (colours, glow, tilt, fill stagger)
 *
 *  Units: lengths are relative to the orb radius (1 = radius of the orb in
 *  the hero), angles are radians, speeds are "per second".
 * ============================================================================
 */

export const stageConfig = {
  /** Liquid-chrome orb material (morph = 0, hero). */
  chrome: {
    /** Overall exposure of the chrome reflections. 1 = neutral. */
    brightness: 1.15,
    /** >1 deepens the black mirrored regions and sharpens highlight bands. */
    contrast: 1.35,
    /** Intensity of the analytic studio softbox / strip lights. */
    stripIntensity: 1.0,
    /** Brightness of the cool-white studio floor reflected in the lower half. */
    floorBrightness: 0.7,
    /** Small, sharp key-light hotspot on top of the environment reflection. */
    specular: 0.7,
    /**
     * Base reflectance (F0) of the metal, linear RGB. Slightly blue = cool,
     * polished chrome. Values near 1 = mirror.
     */
    tint: [0.8, 0.83, 0.88] as const,
  },

  /** Organic liquid surface motion of the orb. */
  ripple: {
    /** Radial displacement of the ripples (fraction of the radius). */
    amplitude: 0.055,
    /** Spatial frequency: higher = more, smaller ripples. */
    frequency: 1.3,
    /** Animation speed of the flowing ripples. */
    speed: 0.2,
    /** Extra ripple amplitude while the pointer hovers the orb (0..1). */
    hoverBoost: 0.4,
    /** Fraction of the ripple amplitude kept in the burst state. */
    burstAmount: 0.1,
  },

  /** Liquid-metal drips on hover (orb state only). */
  drip: {
    /** Global strength. 0 disables drips (and droplets) entirely. */
    intensity: 1,
    /** Number of hanging strands (3..6 looks plausible). */
    strandCount: 5,
    /** Maximum strand length (fraction of the radius). */
    length: 0.65,
    /** Radius of the bead at the tip of a strand. */
    beadRadius: 0.06,
    /** Radius of the thinnest part of a strand (just above the bead). */
    neckRadius: 0.018,
    /** Angular size of the strand root on the orb surface (radians). */
    rootWidth: 0.2,
    /** Small chrome droplets that detach and fall (disabled on low tier). */
    droplets: true,
  },

  /** Chromatic burst (morph = 1, core). */
  burst: {
    /**
     * Extra on-screen scale of the burst relative to the orb (the orb's
     * diameter = the anchor's smaller side). >1 lets the spikes bleed across
     * the surrounding grid lines, like the reference video.
     */
    scale: 1.5,
    /** Number of petal / spike lobes (max 28). */
    spikeCount: 18,
    /** Spike length beyond the core body (fraction of the radius). */
    spikeLength: 1.4,
    /** Random per-spike length variation (0 = all equal). */
    lengthVariance: 0.3,
    /** Radius of the dark body the spikes grow from. */
    coreRadius: 0.45,
    /** Angular footprint of each spike's root (chord length on the unit sphere). */
    spikeWidth: 0.3,
    /** Profile exponent: 1 = straight cone, >1 = needle with flared root. */
    taper: 2.4,
    /** Sideways swelling that turns spikes into tapered petals. */
    petalBulge: 0.02,
    /** Gentle animated sway of the spikes. */
    sway: 0.07,
    /** How much spikes near the cursor stretch toward it (0 disables). */
    pointerFlex: 0.14,
    /** Slow rotation speed of the burst (radians / second). */
    spin: 0.11,
    /** Strength of the per-channel chromatic dispersion at the rims. */
    dispersion: 0.14,
    /** Exposure of the coloured rim reflections. */
    gain: 2.2,
    /**
     * Rim / streak colours. `token` is read from app/globals.css at runtime
     * (so the tokens stay the single source of truth); `fallback` is used if
     * the token is missing. Cyan has no global token — it only exists here.
     */
    palette: {
      red: { token: "--signal-red", fallback: "#ff2a3d" },
      blue: { token: "--signal-blue", fallback: "#2b4bff" },
      cyan: { token: "", fallback: "#3fe6ff" },
    },
  },

  /** Cursor / touch response. */
  pointer: {
    /** Response rate of tilt and reflection shift (higher = snappier, lower = lazier). */
    smoothing: 3.2,
    /** Maximum tilt toward the cursor (radians). */
    maxTilt: 0.42,
    /** How much the reflected studio rotates with the cursor (radians). */
    reflectionShift: 0.35,
    /** Hover zone, as a multiple of the object's on-screen radius. */
    hoverRadius: 1.15,
    /** Autonomous idle motion amplitude (radians). Stronger on touch devices. */
    idleMotion: 0.06,
  },

  /** Rendering and performance. */
  render: {
    /** Device-pixel-ratio caps per device tier. */
    dprCap: { high: 2, mid: 1.5, low: 1.25 },
    /** Sphere subdivisions per icosahedron edge (vertex count ≈ 10 × n²). */
    detail: { high: 128, mid: 84, low: 52 },
    /**
     * Small-orb LOD: while the orb is drawn smaller than this radius (px) and
     * not bursting, a lighter sphere (detail × smallDetailScale) is used.
     */
    smallOrbPx: 170,
    smallDetailScale: 0.55,
    /** If the average frame time over 2 s exceeds this, the DPR steps down. */
    adaptiveFrameMs: 24,
    /** Lowest DPR the adaptive step-down may reach. */
    minDpr: 0.75,
    /** Camera field of view (degrees). Small = near-orthographic. */
    fovDeg: 22,
  },

  /**
   * Hero "Touch" scene (docs/PROMPT-the-touch.md §3). Phase boundaries live in
   * lib/touchScene.ts (TOUCH_PHASES); these knobs shape what happens inside them.
   */
  touch: {
    /** Damping of the scroll progress t (fraction per 60 fps frame; lower = smoother, slower glide). */
    damping: 0.07,
    /** Before the pour the orb sits lower: offset in hero-anchor sides (down = +). */
    orbStartDrop: 1.0,
    /** …but never lower than the wordmark's centre or this fraction of the viewport height. */
    orbStartMaxY: 0.58,
    /** …and larger: scale relative to its settled hero size (phones: portrait layout). */
    orbStartScale: 1.2,
    orbStartScaleMobile: 1.0,
    /** Length the tendril reaches up from the orb at contact (orb radii). */
    tendrilLength: 0.6,
    /** Tendril root width (chord on the unit sphere), neck and bead radii (radii). */
    tendrilRoot: 0.62,
    tendrilNeck: 0.07,
    tendrilBead: 0.085,
    /** Contact event duration (ms) — ripple ring, gold glyph flash, bloom. */
    contactMs: 700,
    /** Radial height of the contact ripple ring (orb radii). */
    rippleAmplitude: 0.06,
    /** Strength of the white specular bloom at the contact point. */
    bloom: 1.2,
    /** Pour stream width at the orb (fraction of the orb radius). */
    streamWidth: 0.2,
    /** While pouring, the orb's underside is held this many radii above the wordmark's top edge. */
    pourClearance: 0.6,
    /** Number of pour streams per tier (one per letter at most). */
    streams: { high: 5, mid: 5, low: 3 },
    /** Length of the drip "roots" under the orb while pouring (orb radii). */
    pourStrandLength: 0.42,
  },

  /** ASCII hand (public/data/hand-glyphs.*), drawn as one instanced glyph layer. */
  hand: {
    /** Overall glyph brightness (1 = data brightness). */
    brightness: 1.1,
    /** Opacity during Arrival/Reach and once settled as atmosphere. */
    opacity: 0.7,
    settledOpacity: 0.15,
    /** How far above its settled box the hand hangs at t = 0 (fraction of its height). */
    arrivalLift: 0.12,
    /**
     * Header band: glyphs under the fixed header (the --header-h token, this
     * value as fallback, px) are dimmed to `headerDim` so its text stays readable.
     */
    topFade: 72,
    headerDim: 0.08,
    /** 1 = fit inside the anchor box; >1 lets the grid grow past the box height to fill its width. */
    overflow: 1.35,
    /** Wrist rotation at full reach (degrees). */
    wristRotate: -5,
    /** Finger sway amplitude (cells) and speed. */
    sway: 0.55,
    swaySpeed: 0.7,
    /** Per-glyph flicker strength (0 = none). */
    flicker: 0.12,
    /** Extra brightness near the contact fingertip at full reach. */
    tipGlow: 0.9,
    /** Desaturation of the data's red/blue tints (1 = pure silver). */
    tintMute: 0.6,
    /** Glyph budget: grids larger than this are merged 2×2 (mid/low tiers & phones). */
    maxGlyphs: { high: 6000, mid: 2500, low: 2500 },
    /** Minimum on-screen cell width (px) before cells are merged 2×2. */
    minCellPx: 4.5,
  },

  /** 3D AAYAM wordmark (public/models/aayam-wordmark(-mobile).glb). */
  wordmark3d: {
    /** Model per tier: "desktop" = full LOD, "mobile" = light LOD. */
    lod: { high: "desktop", mid: "mobile", low: "mobile" } as const,
    /** Body colours (CSS tokens, with fallbacks). */
    colors: {
      magenta: { token: "--wordmark-magenta", fallback: "#c2185b" },
      red: { token: "--wordmark-red", fallback: "#e0313f" },
      orange: { token: "--wordmark-orange", fallback: "#f26b1d" },
      gold: { token: "--wordmark-gold", fallback: "#f6b73c" },
    },
    /** Exposure of the body and of the clearcoat / gold reflections. */
    bodyBrightness: 1.0,
    reflection: 1.3,
    /** Orange glow through the thin parts and rims. */
    glow: 1.05,
    /** Thin-film hue shift on the rims (0 = none). */
    iridescence: 0.5,
    /** Speed of the slowly rotating studio (flowing highlights), rad/s. */
    flowSpeed: 0.08,
    /** Cursor parallax tilt (degrees). */
    tilt: 5,
    /** Pour: delay between letters and fill duration (both in t units). */
    fillStagger: 0.03,
    fillDuration: 0.14,
    /** Height of the glowing molten fill front (fraction of letter height). */
    frontWidth: 0.07,
    /** Brightness of the molten fill front. */
    frontGlow: 2.2,
    /** Fade-in time when the model arrives (ms). */
    fadeMs: 400,
  },

  /** Scroll choreography between the hero and core anchors. */
  scroll: {
    /** Morph runs over this part of the hero→core progress (0..1). */
    morphStart: 0.12,
    morphEnd: 0.88,
    /**
     * Exit: the object fades/shrinks as #explore rises from the bottom of the
     * viewport; fully gone once it has travelled this fraction of the viewport.
     */
    exitDistance: 0.6,
    /** Scale lost while exiting. */
    exitShrink: 0.3,
  },
} as const;

export type StageConfig = typeof stageConfig;
