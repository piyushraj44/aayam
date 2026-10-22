/**
 * The three.js stage: one fixed full-viewport canvas for the whole Home page.
 *
 * Actors (one renderer, one scene):
 * - the orb: a displaced sphere (plus a few instanced droplets) that morphs from
 *   the liquid-chrome orb (hero) into the chromatic burst (core) as the page
 *   scrolls, with the hero "Touch" tendril, contact ripple and drip roots;
 * - the ASCII hand (hand.ts), the pour streams (pour.ts) and the 3D wordmark
 *   (wordmark3d.ts), all driven by the hero timeline (timeline.ts).
 *
 * Loaded lazily by ChromeStage.tsx so three.js stays out of the initial bundle.
 *
 * Coordinate systems
 * - CSS pixels: the camera is set up so that one world unit at z = 0 equals one
 *   CSS pixel, with the origin at the viewport centre (+y up).
 * - Stage space: the object's local frame after rotation (centre at origin,
 *   +y up, +z toward the viewer, 1 unit = orb radius). The group is translated
 *   to the anchor position and scaled by the radius in pixels; the rotation is
 *   applied inside the vertex shader (uRot) so drips can hang straight down.
 */
import {
  Euler,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix3,
  Matrix4,
  Mesh,
  PerspectiveCamera,
  Quaternion,
  Scene,
  ShaderMaterial,
  Vector3,
  Vector4,
  WebGLRenderer,
} from "three";
import { TOUCH_MOBILE_MAX, TOUCH_PHASES, damp, heroProgress, type TouchState } from "@/lib/touchScene";
import { stageConfig as cfg } from "./config";
import { createGeodesicSphere, geodesicSpacing } from "./geometry";
import { HandActor, loadHandData, type HandLayout } from "./hand";
import { PourActor, type Stream } from "./pour";
import { stageFragmentShader } from "./shaders/fragment";
import { dropletVertexShader, stageVertexShader } from "./shaders/vertex";
import { detectTier } from "./tier";
import { CONTACT_FIRE, LETTER_COUNT, touchFrame, type TouchFrame } from "./timeline";
import { clamp01, follow, lerp, mulberry32, readTokenColor, screenToWorld, smoothstep, smootherstep } from "./util";
import { createContext } from "./webgl";
import { WordmarkActor } from "./wordmark3d";

export type StageCallbacks = {
  /** First frame rendered successfully. */
  onReady: () => void;
  /** WebGL is unusable (shader error, context lost for good): show the fallback. */
  onFatal: () => void;
  /** The hero scene is drawn by WebGL ("live") or as a static frame ("static-gl"). */
  onState: (state: Extract<TouchState, "live" | "static-gl">) => void;
};

export type StageHandle = { dispose: () => void };

const MAX_SPIKES = 28;
const MAX_DRIPS = 6;
const IGNORE_SELECTOR = "a, button, input, [data-stage-ignore]";
const CONTEXT_RESTORE_TIMEOUT_MS = 3000;
/** Ripple clock used for the single static frame (reduced motion). */
const STATIC_TIME = 7.3;
/** Furthest a spike tip can reach, in radii (for visibility culling). */
const BURST_REACH =
  cfg.burst.coreRadius +
  cfg.burst.spikeLength * (1 + cfg.burst.lengthVariance / 2) * (1 + cfg.burst.pointerFlex) +
  0.1;

type AnchorRect = { cx: number; cy: number; side: number };
type BoxRect = { left: number; top: number; width: number; height: number; cx: number; cy: number };
/** Approximate letter centres (fraction of the wordmark box) before the model loads. */
const LETTER_GUESS = [0.13, 0.33, 0.5, 0.67, 0.87];

type Spike = {
  axis: Vector3;
  tanA: Vector3;
  tanB: Vector3;
  length: number;
  start: number;
  phase: number;
  freq: number;
};

type Strand = {
  dir: Vector3;
  maxLength: number;
  length: number;
  recoil: number;
  timer: number;
};

type Droplet = {
  active: boolean;
  age: number;
  life: number;
  x: number;
  y: number;
  z: number;
  vy: number;
  radius: number;
};

export function createStage(host: HTMLElement, callbacks: StageCallbacks): StageHandle {
  const tier = detectTier();
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reduced = reducedQuery.matches;

  // ---------------------------------------------------------------- renderer
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.opacity = "0";
  const gl = createContext(canvas, tier === "high");
  if (!gl) throw new Error("WebGL 2 unavailable");

  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, context: gl, alpha: true, antialias: tier === "high" });
  } catch (error) {
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    throw error;
  }
  renderer.setClearColor(0x000000, 0);
  let shaderFailed = false;
  renderer.debug.onShaderError = () => {
    shaderFailed = true;
  };
  host.appendChild(canvas);

  let dpr = Math.min(window.devicePixelRatio || 1, cfg.render.dprCap[tier]);
  renderer.setPixelRatio(dpr);

  const scene = new Scene();
  const camera = new PerspectiveCamera(cfg.render.fovDeg, 1, 1, 10000);
  let width = 1;
  let height = 1;

  // ---------------------------------------------------------------- uniforms
  const palette = cfg.burst.palette;
  const uniforms = {
    uTime: { value: 0 },
    uRippleAmp: { value: cfg.ripple.amplitude as number },
    uRippleFreq: { value: cfg.ripple.frequency },
    uBaseRadius: { value: 1 },
    uEps: { value: geodesicSpacing(cfg.render.detail[tier]) * 0.5 },
    uRot: { value: new Matrix3() },
    uSpikeCount: { value: 0 },
    uSpikeAxis: { value: Array.from({ length: MAX_SPIKES }, () => new Vector4()) },
    uSpikeShape: { value: Array.from({ length: MAX_SPIKES }, () => new Vector4(0, 0, 0, 1)) },
    uSpikeTaper: { value: cfg.burst.taper },
    uPetalBulge: { value: cfg.burst.petalBulge },
    uDripCount: { value: 0 },
    uDrip: { value: Array.from({ length: MAX_DRIPS }, () => new Vector4()) },
    uDripShape: { value: new Vector3(cfg.drip.beadRadius, cfg.drip.neckRadius, cfg.drip.rootWidth) },
    uMorph: { value: 0 },
    uEnvRot: { value: new Matrix3() },
    uTint: { value: new Vector3(...cfg.chrome.tint) },
    uBright: { value: cfg.chrome.brightness },
    uContrast: { value: cfg.chrome.contrast },
    uStrip: { value: cfg.chrome.stripIntensity },
    uFloor: { value: cfg.chrome.floorBrightness },
    uSpecular: { value: cfg.chrome.specular },
    uRed: { value: readTokenColor(palette.red.token, palette.red.fallback) },
    uBlue: { value: readTokenColor(palette.blue.token, palette.blue.fallback) },
    uCyan: { value: readTokenColor(palette.cyan.token, palette.cyan.fallback) },
    uDispersion: { value: cfg.burst.dispersion },
    uBurstGain: { value: cfg.burst.gain },
    uTendril: { value: new Vector4() },
    uTendrilShape: { value: new Vector3(cfg.touch.tendrilBead, cfg.touch.tendrilNeck, cfg.touch.tendrilRoot) },
    uRippleRing: { value: new Vector4() },
    uRingAmp: { value: cfg.touch.rippleAmplitude },
    uBloom: { value: new Vector4() },
    uBloomRadius: { value: 40 },
  };

  // ---------------------------------------------------------------- meshes
  const detailFull = cfg.render.detail[tier];
  const detailSmall = Math.max(24, Math.round(detailFull * cfg.render.smallDetailScale));
  const geometry = createGeodesicSphere(detailFull);
  const geometrySmall = createGeodesicSphere(detailSmall);
  const material = new ShaderMaterial({
    uniforms,
    vertexShader: stageVertexShader,
    fragmentShader: stageFragmentShader,
    defines: { MAX_SPIKES, MAX_DRIPS, QUALITY: tier === "high" ? 2 : tier === "mid" ? 1 : 0 },
  });
  const mesh = new Mesh(geometry, material);
  mesh.frustumCulled = false;

  const stage = new Group();
  stage.add(mesh);
  scene.add(stage);

  const dripsEnabled = cfg.drip.intensity > 0;
  const strandCount = dripsEnabled ? Math.min(MAX_DRIPS, Math.max(1, Math.round(cfg.drip.strandCount))) : 0;
  const useDroplets = dripsEnabled && cfg.drip.droplets && tier !== "low";

  let dropletGeometry: IcosahedronGeometry | null = null;
  let dropletMaterial: ShaderMaterial | null = null;
  let dropletMesh: InstancedMesh | null = null;
  if (useDroplets) {
    dropletGeometry = new IcosahedronGeometry(1, 4);
    dropletMaterial = new ShaderMaterial({
      uniforms, // shared: same environment, same chrome
      vertexShader: dropletVertexShader,
      fragmentShader: stageFragmentShader,
    });
    dropletMesh = new InstancedMesh(dropletGeometry, dropletMaterial, strandCount);
    dropletMesh.frustumCulled = false;
    const zero = new Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < strandCount; i++) dropletMesh.setMatrixAt(i, zero);
    stage.add(dropletMesh);
  }

  // ---------------------------------------------------------------- shape data
  const rand = mulberry32(0xaa7a3);
  const spikeCount = Math.min(MAX_SPIKES, Math.max(1, Math.round(cfg.burst.spikeCount)));
  const golden = Math.PI * (3 - Math.sqrt(5));
  const spikes: Spike[] = [];
  for (let i = 0; i < spikeCount; i++) {
    const y = 1 - (2 * (i + 0.5)) / spikeCount;
    const r = Math.sqrt(1 - y * y);
    const phi = i * golden;
    const axis = new Vector3(Math.cos(phi) * r, y, Math.sin(phi) * r);
    axis.x += (rand() - 0.5) * 0.16;
    axis.y += (rand() - 0.5) * 0.16;
    axis.z += (rand() - 0.5) * 0.16;
    axis.normalize();
    const helper = Math.abs(axis.y) < 0.9 ? new Vector3(0, 1, 0) : new Vector3(1, 0, 0);
    const tanA = new Vector3().crossVectors(axis, helper).normalize();
    const tanB = new Vector3().crossVectors(axis, tanA);
    const variance = cfg.burst.lengthVariance;
    spikes.push({
      axis,
      tanA,
      tanB,
      length: cfg.burst.spikeLength * (1 - variance / 2 + rand() * variance),
      start: rand() * 0.42,
      phase: rand() * Math.PI * 2,
      freq: 0.35 + rand() * 0.4,
    });
  }

  const strands: Strand[] = [];
  for (let j = 0; j < strandCount; j++) {
    // Roots spread across the lower-front and sides (azimuth 0 = toward the
    // viewer), 45–77° up from the bottom pole, so the strands drape over the
    // visible silhouette instead of hiding underneath the orb.
    const spread = strandCount > 1 ? j / (strandCount - 1) - 0.5 : 0;
    const az = spread * 3.1 + (rand() - 0.5) * 0.35;
    const beta = 0.8 + rand() * 0.55; // angle from the bottom pole
    strands.push({
      dir: new Vector3(Math.sin(beta) * Math.sin(az), -Math.cos(beta), Math.sin(beta) * Math.cos(az)),
      maxLength: cfg.drip.length * (0.65 + 0.35 * rand()),
      length: 0,
      recoil: 0,
      timer: 0.8 + rand() * 1.5,
    });
  }
  const droplets: Droplet[] = strands.map(() => ({ active: false, age: 0, life: 0.7, x: 0, y: 0, z: 0, vy: 0, radius: 0 }));

  // ---------------------------------------------------------------- touch actors
  const streamCount = Math.min(cfg.touch.streams[tier], strandCount, LETTER_COUNT);
  /** Which letter each stream pours into (spread evenly when fewer than five). */
  const streamLetter = Array.from({ length: streamCount }, (_, j) =>
    streamCount >= LETTER_COUNT ? j : Math.round((j * (LETTER_COUNT - 1)) / Math.max(1, streamCount - 1)),
  );
  const pour = streamCount > 0 ? new PourActor(streamCount) : null;
  if (pour) scene.add(pour.mesh);
  const streams: Stream[] = streamLetter.map(() => ({ x0: 0, y0: 0, x1: 0, y1: 0, width: 0, head: 0, tail: 0 }));
  /** Stage-space root direction of each stream's drip strand. */
  const pourDirs = streamLetter.map(() => new Vector3(0, -1, 0));
  let hand: HandActor | null = null;
  let handLayout: HandLayout | null = null;
  let handFade = 0;
  let wordmark: WordmarkActor | null = null;
  let wordmarkFade = 0;
  let stateSent: "live" | "static-gl" | null = null;
  const loadAbort = new AbortController();

  let touchT = 1;
  let touchInit = false;
  let frameT: TouchFrame = touchFrame(1);
  let contactArmed = true;
  let contactAge = Infinity;
  const contactDir = new Vector3(0, 1, 0);
  const contactPoint = { x: 0, y: 0 };
  const tip = { x: 0, y: 0, valid: false };
  /** Pre-pour orb pose (screen px): where the tendril meets the hand. */
  const preOrb = { cx: 0, cy: 0, r: 0 };
  let wmTiltX = 0;
  let wmTiltY = 0;
  const ones: number[] = new Array(LETTER_COUNT).fill(1);

  // ---------------------------------------------------------------- state
  const anchors: Record<"hero" | "core" | "explore" | "hand" | "wordmark" | "scene", HTMLElement | null> = {
    hero: null,
    core: null,
    explore: null,
    hand: null,
    wordmark: null,
    scene: null,
  };
  let heroRect: AnchorRect | null = null;
  let handRect: BoxRect | null = null;
  let wordmarkRect: BoxRect | null = null;
  let coreRect: AnchorRect | null = null;
  let exploreTop: number | null = null;
  let rectsDirty = true;
  let frameCount = 0;

  const pointer = { x: 0, y: 0, has: false, active: false };
  const touch = { active: false, x0: 0, y0: 0, t0: 0, moved: false };
  let dripPulse = 0; // seconds of tap-triggered drip remaining

  let clock = 0;
  let rippleClock = STATIC_TIME;
  let morph = 0;
  let hover = 0;
  let burstHover = 0;
  let tiltX = 0;
  let tiltY = 0;
  let envYaw = 0;
  let envPitch = 0;
  let intro = reduced ? 1 : 0;
  let lastOpacity = -1;
  let cleared = true;
  let readyFired = false;

  // Placement of the current frame (CSS px).
  const place = { cx: 0, cy: 0, radius: 0, morph: 0, fade: 1, visible: false };

  // Scratch objects (no per-frame allocation).
  const spin = new Quaternion().setFromEuler(new Euler(0.35, -0.6, 0.15));
  const tiltQ = new Quaternion();
  const stepQ = new Quaternion();
  const rotQ = new Quaternion();
  const euler = new Euler();
  const m4 = new Matrix4();
  const rotT = new Matrix3();
  const spinAxis = new Vector3();
  const v3 = new Vector3();
  const v3b = new Vector3();
  const dropletMatrix = new Matrix4();
  const dropletPos = new Vector3();
  const dropletScale = new Vector3();
  const identityQ = new Quaternion();

  // ---------------------------------------------------------------- layout
  function resolveAnchors() {
    const prevHero = anchors.hero;
    const prevCore = anchors.core;
    if (!anchors.hero?.isConnected) anchors.hero = document.querySelector<HTMLElement>('[data-stage-anchor="hero"]');
    if (!anchors.core?.isConnected) anchors.core = document.querySelector<HTMLElement>('[data-stage-anchor="core"]');
    if (!anchors.explore?.isConnected) anchors.explore = document.getElementById("explore");
    const prevHand = anchors.hand;
    const prevWordmark = anchors.wordmark;
    if (!anchors.hand?.isConnected) anchors.hand = document.querySelector<HTMLElement>('[data-stage-anchor="hand"]');
    if (!anchors.wordmark?.isConnected)
      anchors.wordmark = document.querySelector<HTMLElement>('[data-stage-anchor="wordmark"]');
    if (!anchors.scene?.isConnected) anchors.scene = document.querySelector<HTMLElement>("[data-touch-scene]");
    if (
      anchors.hero !== prevHero ||
      anchors.core !== prevCore ||
      anchors.hand !== prevHand ||
      anchors.wordmark !== prevWordmark
    ) {
      anchorObserver.disconnect();
      for (const el of [anchors.hero, anchors.core, anchors.hand, anchors.wordmark]) if (el) anchorObserver.observe(el);
    }
  }

  function measure(el: HTMLElement | null): AnchorRect | null {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return null;
    return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, side: Math.min(r.width, r.height) };
  }

  function measureBox(el: HTMLElement | null): BoxRect | null {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return null;
    return { left: r.left, top: r.top, width: r.width, height: r.height, cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
  }

  function readRects() {
    resolveAnchors();
    heroRect = measure(anchors.hero);
    coreRect = measure(anchors.core);
    handRect = measureBox(anchors.hand);
    wordmarkRect = measureBox(anchors.wordmark);
    handLayout = hand && handRect ? hand.layout(handRect) : null;
    exploreTop = anchors.explore ? anchors.explore.getBoundingClientRect().top : null;
    rectsDirty = false;
  }

  /** Where (and in which state) to draw the object for the current scroll. */
  function computePlacement() {
    // Hero pose follows the Touch: lower and larger before the pour, then it
    // rises and shrinks into the settled hero anchor.
    let touchHero: AnchorRect | null = null;
    if (heroRect) {
      const tc = cfg.touch;
      preOrb.cx = heroRect.cx;
      preOrb.cy = Math.max(
        heroRect.cy,
        Math.min(heroRect.cy + heroRect.side * tc.orbStartDrop, wordmarkRect?.cy ?? Infinity, height * tc.orbStartMaxY),
      );
      preOrb.r = (heroRect.side / 2) * (width <= TOUCH_MOBILE_MAX ? tc.orbStartScaleMobile : tc.orbStartScale);
      const k = smootherstep(frameT.orbSettle);
      touchHero = {
        cx: heroRect.cx,
        cy: lerp(preOrb.cy, heroRect.cy, k),
        side: lerp(preOrb.r * 2, heroRect.side, k),
      };
    }
    const a = touchHero ?? coreRect;
    const b = coreRect ?? touchHero;
    if (!a || !b) {
      place.visible = false;
      return;
    }
    const vc = height / 2;
    let p: number;
    if (heroRect && coreRect) {
      if (anchors.scene) {
        // Pinned hero: p = 0 until the pin releases (the sticky stage starts
        // scrolling away), 1 once the core anchor is centred. Both anchors move
        // together after the release, so this is linear in scroll.
        const past = Math.max(0, window.innerHeight - anchors.scene.getBoundingClientRect().bottom);
        const toGo = coreRect.cy - vc;
        p = toGo <= 0 ? 1 : clamp01(past / (past + toGo));
      } else {
        const span = heroRect.cy - coreRect.cy;
        p = Math.abs(span) < 1 ? 1 : clamp01((heroRect.cy - vc) / span);
      }
    } else {
      p = coreRect ? 1 : 0;
    }
    const e = smootherstep(p);
    const sc = cfg.scroll;

    let q = 0;
    if (exploreTop !== null) q = clamp01((height - exploreTop) / (height * sc.exitDistance));
    else if (coreRect) q = clamp01((vc - coreRect.cy) / (height * sc.exitDistance));

    place.cx = lerp(a.cx, b.cx, e);
    place.cy = lerp(a.cy, b.cy, e);
    place.morph = smoothstep(sc.morphStart, sc.morphEnd, p);
    place.radius =
      // morph² delays the burst's growth so the half-formed star doesn't pass behind hero copy
      (lerp(a.side, b.side, e) / 2) *
      lerp(1, cfg.burst.scale, place.morph * place.morph) *
      (1 - sc.exitShrink * q);
    place.fade = 1 - smoothstep(0, 1, q);

    const extent = place.radius * lerp(1.1, BURST_REACH, place.morph);
    const below = place.radius * (1 + cfg.drip.length + 0.6);
    place.visible =
      place.fade > 0.004 &&
      place.radius > 1 &&
      place.cx + extent > 0 &&
      place.cx - extent < width &&
      place.cy + Math.max(extent, below) > 0 &&
      place.cy - extent < height;
  }

  function resize() {
    width = Math.max(1, host.clientWidth);
    height = Math.max(1, host.clientHeight);
    renderer.setSize(width, height, false);
    const dist = height / 2 / Math.tan((cfg.render.fovDeg * Math.PI) / 360);
    camera.aspect = width / height;
    camera.position.set(0, 0, dist);
    camera.near = Math.max(1, dist - 3000);
    camera.far = dist + 3000;
    camera.updateProjectionMatrix();
    rectsDirty = true;
  }

  // ---------------------------------------------------------------- simulation
  function updateInteraction(dt: number, still: boolean) {
    const pc = cfg.pointer;
    const r = place.radius;
    const locked = document.body.dataset.scrollLocked === "true";
    const usable = !still && !locked && pointer.has && (pointer.active || touch.active);

    let targetTiltX = 0;
    let targetTiltY = 0;
    let targetEnvYaw = 0;
    let targetEnvPitch = 0;
    let hoverTarget = 0;
    let burstTarget = 0;

    if (usable) {
      const dx = Math.max(-1, Math.min(1, (pointer.x - place.cx) / (width * 0.5)));
      const dy = Math.max(-1, Math.min(1, (pointer.y - place.cy) / (height * 0.5)));
      const k = touch.active ? 0.7 : 1;
      targetTiltY = dx * pc.maxTilt * k;
      targetTiltX = dy * pc.maxTilt * 0.8 * k;
      targetEnvYaw = dx * pc.reflectionShift;
      targetEnvPitch = dy * pc.reflectionShift * 0.5;
      if (pointer.active) {
        const dist = Math.hypot(pointer.x - place.cx, pointer.y - place.cy);
        if (dist < pc.hoverRadius * r) hoverTarget = 1;
        if (dist < pc.hoverRadius * r * 1.6) burstTarget = 1;
      }
    }
    if (dripPulse > 0 && !still) {
      hoverTarget = 1;
      dripPulse = Math.max(0, dripPulse - dt);
    }

    if (!still) {
      const idle = pc.idleMotion * (coarse ? 2 : 1);
      targetTiltX += Math.sin(clock * 0.31) * idle;
      targetTiltY += Math.cos(clock * 0.23) * idle;
    }

    if (still) {
      tiltX = targetTiltX;
      tiltY = targetTiltY;
      envYaw = targetEnvYaw;
      envPitch = targetEnvPitch;
      hover = 0;
      burstHover = 0;
      return;
    }
    const f = follow(pc.smoothing, dt);
    tiltX += (targetTiltX - tiltX) * f;
    tiltY += (targetTiltY - tiltY) * f;
    envYaw += (targetEnvYaw - envYaw) * f;
    envPitch += (targetEnvPitch - envPitch) * f;
    hover += (hoverTarget - hover) * follow(hoverTarget > hover ? 3 : 2, dt);
    burstHover += (burstTarget - burstHover) * follow(2.5, dt);
  }

  function updateRotation(dt: number, still: boolean) {
    if (!still) {
      // Integrate a slow spin whose axis drifts from "upright" (orb) to
      // "facing the viewer" (burst) so the burst turns like a flower.
      spinAxis.set(lerp(0.1, 0.25, morph), lerp(1, 0.55, morph), lerp(0.1, 1, morph)).normalize();
      const speed = lerp(0.05, cfg.burst.spin, morph);
      stepQ.setFromAxisAngle(spinAxis, speed * dt);
      spin.premultiply(stepQ).normalize();
    }
    euler.set(tiltX, tiltY, 0, "XYZ");
    tiltQ.setFromEuler(euler);
    rotQ.multiplyQuaternions(tiltQ, spin);
    m4.makeRotationFromQuaternion(rotQ);
    uniforms.uRot.value.setFromMatrix4(m4);
    rotT.copy(uniforms.uRot.value).transpose();

    euler.set(envPitch, envYaw, 0, "YXZ");
    m4.makeRotationFromEuler(euler);
    uniforms.uEnvRot.value.setFromMatrix4(m4);
  }

  function updateSpikes() {
    const bc = cfg.burst;
    const pvx = place.radius > 0 ? (pointer.x - place.cx) / place.radius : 0;
    const pvy = place.radius > 0 ? -(pointer.y - place.cy) / place.radius : 0;
    const pLen = Math.hypot(pvx, pvy);
    const flexOn = burstHover > 0.001 && pLen > 1e-3 && bc.pointerFlex > 0;
    let active = 0;
    for (let i = 0; i < spikes.length; i++) {
      const s = spikes[i];
      const g = smoothstep(s.start, s.start + 0.55, morph);
      let length = s.length * Math.pow(g, 1.35);
      const axisU = uniforms.uSpikeAxis.value[i];
      const shapeU = uniforms.uSpikeShape.value[i];

      // Sway (object space, perpendicular to the axis).
      const sw = bc.sway * g;
      const a = Math.sin(clock * s.freq + s.phase) * sw;
      const b = Math.cos(clock * s.freq * 0.8 + s.phase * 1.7) * sw;
      v3.copy(s.tanA).multiplyScalar(a).addScaledVector(s.tanB, b);

      if (flexOn && length > 0) {
        // Spikes pointing toward the cursor (on screen) stretch and lean to it.
        v3b.copy(s.axis).applyMatrix3(uniforms.uRot.value);
        const sl = Math.hypot(v3b.x, v3b.y);
        if (sl > 1e-3) {
          const align = Math.max(0, (v3b.x * pvx + v3b.y * pvy) / (sl * pLen));
          const w = Math.pow(align, 6) * sl * burstHover;
          length *= 1 + bc.pointerFlex * w;
          // Pointer direction in object space, made perpendicular to the axis.
          v3b.set(pvx / pLen, pvy / pLen, 0).applyMatrix3(rotT);
          v3b.addScaledVector(s.axis, -v3b.dot(s.axis));
          v3.addScaledVector(v3b, 0.12 * w);
        }
      }
      axisU.set(s.axis.x, s.axis.y, s.axis.z, length);
      shapeU.set(v3.x, v3.y, v3.z, lerp(0.95, bc.spikeWidth, g));
      if (length > 0) active++;
    }
    // Skip the spike loop in the shader entirely while the orb is pure.
    uniforms.uSpikeCount.value = active > 0 ? spikes.length : 0;
    uniforms.uBaseRadius.value = lerp(1, bc.coreRadius, smoothstep(0.05, 0.75, morph));
  }

  function updateDrips(dt: number, still: boolean) {
    const dc = cfg.drip;
    const drive = still ? 0 : hover * dc.intensity * (1 - smoothstep(0.03, 0.35, morph));
    const pxStage = place.radius > 0 ? (pointer.x - place.cx) / place.radius : 0;
    let dropletsChanged = false;
    let hanging = 0;

    for (let j = 0; j < strands.length; j++) {
      const s = strands[j];
      // Strands under the cursor grow a little longer.
      const near = Math.exp(-((pxStage - s.dir.x) ** 2) / 0.3);
      let target = drive * s.maxLength * (0.6 + 0.4 * near);
      if (s.recoil > 0) {
        target *= 0.45;
        s.recoil = Math.max(0, s.recoil - dt);
      }
      if (still) s.length = 0;
      else s.length += (target - s.length) * follow(target > s.length ? 1.6 : 3.5, dt);
      if (s.length < 0.002) s.length = 0;

      // Occasionally a bead pinches off as a droplet.
      const d = droplets[j];
      if (useDroplets && !still && drive > 0.8 && !d.active && s.length > 0.85 * s.maxLength * (0.6 + 0.4 * near)) {
        s.timer -= dt;
        if (s.timer <= 0) {
          const bead = Math.min(dc.beadRadius, s.length * 0.3);
          d.active = true;
          d.age = 0;
          d.life = 0.6 + rand() * 0.25;
          d.x = s.dir.x;
          d.y = s.dir.y - (s.length - bead);
          d.z = s.dir.z;
          d.vy = 0;
          d.radius = bead;
          s.recoil = 0.35;
          s.timer = 1.4 + rand() * 2.2;
        }
      }
      // While pouring, the first strands become the roots of the streams:
      // their anchors swing toward each stream's letter and their length is
      // scrubbed by the timeline (not time-smoothed, so it rewinds exactly).
      let len = s.length;
      if (j < streamCount && !still && frameT.pourRoots > 0) {
        const w = smoothstep(0, 0.3, frameT.pourRoots);
        v3.copy(s.dir).lerp(pourDirs[j], w).normalize();
        len = Math.max(len, frameT.pourRoots * cfg.touch.pourStrandLength);
        uniforms.uDrip.value[j].set(v3.x, v3.y, v3.z, len);
      } else {
        uniforms.uDrip.value[j].set(s.dir.x, s.dir.y, s.dir.z, len);
      }
      if (len > 0) hanging++;
    }
    // Skip the drip loop in the shader when no strand is out.
    uniforms.uDripCount.value = hanging > 0 ? strands.length : 0;

    if (dropletMesh) {
      for (let j = 0; j < droplets.length; j++) {
        const d = droplets[j];
        if (!d.active) continue;
        dropletsChanged = true;
        d.age += dt;
        d.vy += 3.2 * dt; // gravity in radii / s²
        d.y -= d.vy * dt;
        const t = d.age / d.life;
        const s = still || t >= 1 ? 0 : d.radius * (1 - smoothstep(0.45, 1, t));
        if (s <= 0) d.active = false;
        dropletPos.set(d.x, d.y, d.z);
        dropletScale.set(s, s * (1 + 0.25 * Math.min(1, d.vy)), s);
        dropletMatrix.compose(dropletPos, identityQ, dropletScale);
        dropletMesh.setMatrixAt(j, dropletMatrix);
      }
      if (dropletsChanged) dropletMesh.instanceMatrix.needsUpdate = true;
    }
  }

  // ---------------------------------------------------------------- touch
  /** Screen position (px) of letter i: centre x, top and bottom y. */
  function letterScreen(i: number, out: { x: number; top: number; bottom: number }) {
    if (!wordmarkRect) return false;
    if (wordmark) {
      const k = wordmarkRect.width / wordmark.width;
      const l = wordmark.letters[i];
      if (!l) return false;
      out.x = wordmarkRect.cx + l.cx * k;
      out.top = wordmarkRect.cy - l.maxY * k;
      out.bottom = wordmarkRect.cy - l.minY * k;
    } else {
      out.x = wordmarkRect.left + wordmarkRect.width * LETTER_GUESS[i];
      out.top = wordmarkRect.top;
      out.bottom = wordmarkRect.top + wordmarkRect.height;
    }
    return true;
  }
  const letterPos = { x: 0, top: 0, bottom: 0 };

  /** Hand, contact event, pour streams and wordmark. Returns true if any is on screen. */
  function updateTouchActors(dt: number, still: boolean): boolean {
    const f = frameT;
    const tc = cfg.touch;
    let visible = false;

    // --- contact event (time-based, ≤ 600 ms, re-armed below contactRearm)
    if (!still) {
      if (touchT < TOUCH_PHASES.contactRearm) contactArmed = true;
      if (contactArmed && touchT >= CONTACT_FIRE && tip.valid && morph < 0.05) {
        contactArmed = false;
        contactAge = 0;
        contactPoint.x = tip.x;
        contactPoint.y = tip.y;
        contactDir.set(tip.x - place.cx, -(tip.y - place.cy), 0).normalize();
      }
    }
    const contactDur = Math.min(600, tc.contactMs) / 1000;
    contactAge += dt;
    const cp = still ? 1 : Math.min(1, contactAge / contactDur);
    const contactOn = cp < 1;
    // A single ease-out: quick rise, long fall. Never more than one flash.
    const flash = contactOn ? (cp < 0.15 ? cp / 0.15 : Math.pow(1 - (cp - 0.15) / 0.85, 2)) : 0;
    uniforms.uRippleRing.value.set(contactDir.x, contactDir.y, contactDir.z, contactOn ? Math.max(0.0001, cp) : 0);
    if (contactOn) {
      const [bx, by] = screenToWorld(contactPoint.x, contactPoint.y, width, height);
      uniforms.uBloom.value.set(bx, by, place.radius * 0.2, tc.bloom * flash);
      uniforms.uBloomRadius.value = Math.max(8, place.radius * 0.32);
    } else {
      uniforms.uBloom.value.w = 0;
    }

    // --- hand
    tip.valid = false;
    if (hand && handLayout && handRect) {
      const hc = cfg.hand;
      const L = handLayout;
      handFade = still ? 1 : Math.min(1, handFade + dt / 0.5);
      // Contact point: just above the pre-pour orb, one tendril length up.
      const pcX = preOrb.cx;
      const pcY = preOrb.cy - preOrb.r * (1 + tc.tendrilLength);
      // Arrival: hanging a little above its settled box (partly cropped by the
      // top edge); after the pour it settles back into the box as atmosphere.
      const arrivalX = L.restTipX;
      const arrivalY = L.restTipY - hc.arrivalLift * L.gridH;
      // The base pose switches while the fingertip is held at the contact point
      // (drop = 1 there), so the switch itself is never visible.
      const settled = f.t >= CONTACT_FIRE;
      const baseX = settled ? L.restTipX : arrivalX;
      const baseY = settled ? L.restTipY : arrivalY;
      const drop = heroRect ? smootherstep(f.handDrop) : 0;
      tip.x = lerp(baseX, pcX, drop);
      tip.y = lerp(baseY, pcY, drop);
      tip.valid = heroRect !== null;
      hand.update(
        {
          time: clock,
          width,
          height,
          tipX: tip.x,
          tipY: tip.y,
          rotation: ((hc.wristRotate * Math.PI) / 180) * drop,
          opacity: f.handOpacity * smootherstep(handFade),
          tipGlow: drop,
          flash: still ? 0 : flash,
          flashRadius: cp * 26,
          rain: still ? 0 : f.glyphRain,
        },
        L,
      );
      const top = tip.y - (L.restTipY - handRect.top) - L.gridH * 0.2;
      const bottom = top + L.gridH * 1.4;
      if (hand.mesh.visible && bottom > 0 && top < height) visible = true;
      else hand.mesh.visible = false;
    }

    // --- pour streams (from the orb's drip roots into each letter's fill front)
    if (pour) {
      const R = place.radius;
      for (let j = 0; j < streamCount; j++) {
        const li = streamLetter[j];
        const st = streams[j];
        st.head = 0;
        st.tail = 0;
        if (still || !place.visible || morph > 0.05 || !letterScreen(li, letterPos)) continue;
        // Root direction on the underside of the orb, leaning toward the letter.
        const sx = Math.max(-0.62, Math.min(0.62, (letterPos.x - place.cx) / (R * 2.4)));
        pourDirs[j].set(sx, -Math.sqrt(Math.max(0.05, 1 - sx * sx - 0.09)), 0.3).normalize();
        const rootLen = f.pourRoots * tc.pourStrandLength;
        const fill = f.fill[li];
        st.x0 = place.cx + R * pourDirs[j].x;
        st.y0 = place.cy - R * (pourDirs[j].y - rootLen * 0.82);
        st.x1 = letterPos.x;
        // Never pour upward (when the orb still overlaps a letter the stream hides behind it).
        st.y1 = Math.max(st.y0 + 4, lerp(letterPos.bottom, letterPos.top, fill));
        st.width = tc.streamWidth * R * (1 - 0.5 * f.settle);
        st.head = f.streamHead[li];
        st.tail = Math.max(f.streamTail[li], 1 - smoothstep(0, 0.25, f.pourRoots));
      }
      pour.update(streams, clock, width, height);
      if (pour.mesh.visible) visible = true;
    }

    // --- 3D wordmark
    if (wordmark) {
      const r = wordmarkRect;
      const onScreen = r !== null && r.top + r.height > -r.height && r.top < height + r.height;
      if (r && onScreen) {
        const wc = cfg.wordmark3d;
        wordmarkFade = still ? 1 : Math.min(1, wordmarkFade + dt / (wc.fadeMs / 1000));
        const [wx, wy] = screenToWorld(r.cx, r.cy, width, height);
        wordmark.place(wx, wy, r.width);
        const deg = (wc.tilt * Math.PI) / 180;
        let tx = 0;
        let ty = 0;
        if (!still && pointer.has && pointer.active && document.body.dataset.scrollLocked !== "true") {
          ty = Math.max(-1, Math.min(1, (pointer.x - r.cx) / (width * 0.5))) * deg;
          tx = Math.max(-1, Math.min(1, (pointer.y - r.cy) / (height * 0.5))) * deg * 0.6;
        }
        const k = still ? 1 : follow(cfg.pointer.smoothing, dt);
        wmTiltX += (tx - wmTiltX) * k;
        wmTiltY += (ty - wmTiltY) * k;
        wordmark.update({
          fill: still ? ones : f.fill,
          frontGlow: still ? 0 : f.frontGlow,
          sweep: still ? 0 : f.sweep,
          time: still ? 0 : clock,
          alpha: smootherstep(wordmarkFade),
          tiltX: wmTiltX,
          tiltY: wmTiltY,
        });
        if (wordmark.group.visible) visible = true;
      } else {
        wordmark.group.visible = false;
      }
    }
    return visible;
  }

  /** Tendril from the top of the orb toward the descending fingertip. */
  function updateTendril(still: boolean) {
    const u = uniforms.uTendril.value;
    u.w = 0;
    if (still || !tip.valid || !place.visible || morph > 0.05 || frameT.tendril <= 0.001) return;
    const dx = (tip.x - place.cx) / place.radius;
    const dy = -(tip.y - place.cy) / place.radius;
    const dist = Math.hypot(dx, dy);
    if (dist < 1.01) return;
    const len = Math.min(dist - 1, cfg.touch.tendrilLength * frameT.tendril);
    u.set(dx / dist, dy / dist, 0, Math.max(0, len));
  }

  /** Tell the page the hero is drawn by WebGL once the wordmark is on screen. */
  function sendState() {
    if (!wordmark || wordmarkFade <= 0) return;
    const next = reduced ? "static-gl" : "live";
    if (stateSent !== next) {
      stateSent = next;
      callbacks.onState(next);
    }
  }

  /** Loads the hand and the wordmark after the orb's first frame (off the critical path). */
  function loadActors() {
    loadHandData(loadAbort.signal)
      .then((data) => HandActor.create(data, tier, handRect?.width ?? width * 0.6))
      .then(async (h) => {
        if (disposed) {
          h.dispose();
          return;
        }
        h.mesh.visible = false;
        scene.add(h.mesh);
        await renderer.compileAsync(h.mesh, camera, scene);
        if (disposed) return;
        hand = h;
        handLayout = handRect ? h.layout(handRect) : null;
        wake();
      })
      .catch(() => undefined);

    const lod = cfg.wordmark3d.lod[tier];
    const url = lod === "desktop" ? "/models/aayam-wordmark.glb" : "/models/aayam-wordmark-mobile.glb";
    WordmarkActor.load(url, renderer, camera, scene)
      .then((w) => {
        if (disposed) {
          w.dispose();
          return;
        }
        wordmark = w;
        wake();
      })
      .catch(() => undefined);
  }

  // ---------------------------------------------------------------- frame
  /** Advances and draws one frame. Returns false when nothing is visible. */
  function step(dt: number, still: boolean): boolean {
    frameCount++;
    if (rectsDirty || frameCount % 30 === 0) readRects();

    // Hero progress: raw scroll target, damped frame-rate independently.
    const target = still || !anchors.scene ? 1 : heroProgress(anchors.scene, window.innerHeight);
    touchT = still || !touchInit ? target : damp(touchT, target, cfg.touch.damping, dt);
    touchInit = true;
    frameT = touchFrame(touchT);

    computePlacement();
    const heroVisible = updateTouchActors(dt, still);

    if (!place.visible && !heroVisible) {
      if (!cleared) {
        stage.visible = false;
        if (hand) hand.mesh.visible = false;
        if (pour) pour.mesh.visible = false;
        if (wordmark) wordmark.group.visible = false;
        renderer.render(scene, camera);
        cleared = true;
        canvas.style.opacity = "0";
        lastOpacity = 0;
      }
      return false;
    }

    clock += dt;
    morph = still ? place.morph : morph + (place.morph - morph) * follow(7, dt);
    intro = still ? 1 : Math.min(1, intro + dt / 0.5);

    updateInteraction(dt, still);
    updateRotation(dt, still);
    updateSpikes();
    updateDrips(dt, still);

    const rc = cfg.ripple;
    rippleClock = still ? STATIC_TIME : rippleClock + dt * rc.speed * (1 + 0.6 * hover);
    uniforms.uTime.value = rippleClock;
    uniforms.uRippleAmp.value = rc.amplitude * (1 + rc.hoverBoost * hover) * lerp(1, rc.burstAmount, morph);
    uniforms.uMorph.value = morph;

    stage.visible = place.visible;
    // Lighter sphere while the orb is small on screen (the vertex shader is the cost).
    const small = place.radius < cfg.render.smallOrbPx && morph < 0.02;
    mesh.geometry = small ? geometrySmall : geometry;
    uniforms.uEps.value = geodesicSpacing(small ? detailSmall : detailFull) * 0.5;
    stage.position.set(place.cx - width / 2, height / 2 - place.cy, 0);
    stage.scale.setScalar(place.radius);
    updateTendril(still);
    renderer.render(scene, camera);
    cleared = false;
    sendState();

    const opacity = Math.round(place.fade * smootherstep(intro) * 1000) / 1000;
    if (opacity !== lastOpacity) {
      canvas.style.opacity = String(opacity);
      lastOpacity = opacity;
    }
    if (shaderFailed) {
      callbacks.onFatal();
      return false;
    }
    if (!readyFired) {
      readyFired = true;
      callbacks.onReady();
    }
    return true;
  }

  // ---------------------------------------------------------------- loop
  let raf = 0;
  let running = false;
  let staticQueued = false;
  let lastNow = 0;
  let disposed = false;
  let lost = false;
  let compiled = false;
  // Adaptive resolution
  let perfStart = 0;
  let perfSum = 0;
  let perfFrames = 0;
  let perfWindow = 0;
  let slowWindows = 0;

  function frame(now: number) {
    if (!running) return;
    const rawDt = Math.max(0, (now - lastNow) / 1000);
    const dt = Math.min(0.05, rawDt);
    lastNow = now;
    const visible = step(dt, false);
    if (!visible || document.hidden) {
      running = false;
      return;
    }
    // Long gaps are pauses or throttling (occluded window), not GPU load.
    if (rawDt < 0.1) trackPerformance(now, rawDt);
    raf = requestAnimationFrame(frame);
  }

  function trackPerformance(now: number, dt: number) {
    if (now - perfStart < 1500 || dpr <= cfg.render.minDpr) return;
    perfSum += dt * 1000;
    perfFrames++;
    perfWindow += dt;
    if (perfWindow >= 2) {
      // Two slow windows in a row (4 s) → render at a lower resolution.
      slowWindows = perfSum / perfFrames > cfg.render.adaptiveFrameMs ? slowWindows + 1 : 0;
      if (slowWindows >= 2) {
        slowWindows = 0;
        dpr = Math.max(cfg.render.minDpr, dpr - 0.25);
        renderer.setPixelRatio(dpr);
        renderer.setSize(width, height, false);
      }
      perfSum = 0;
      perfFrames = 0;
      perfWindow = 0;
    }
  }

  /** Make sure something will draw: the loop (motion) or one frame (reduced). */
  function wake() {
    if (disposed || lost || !compiled || document.hidden) return;
    if (reduced) {
      if (staticQueued) return;
      staticQueued = true;
      raf = requestAnimationFrame(() => {
        staticQueued = false;
        if (!disposed && !lost) step(0, true);
      });
      return;
    }
    if (running) return;
    running = true;
    lastNow = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    staticQueued = false;
    cancelAnimationFrame(raf);
  }

  // ---------------------------------------------------------------- events
  const anchorObserver = new ResizeObserver(() => {
    rectsDirty = true;
    wake();
  });
  const hostObserver = new ResizeObserver(() => {
    resize();
    wake();
  });

  function isIgnored(target: EventTarget | null): boolean {
    if (document.body.dataset.scrollLocked === "true") return true;
    return target instanceof Element && target.closest(IGNORE_SELECTOR) !== null;
  }

  function onPointerMove(e: PointerEvent) {
    if (e.pointerType === "touch") {
      if (!touch.active) return;
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      if (Math.hypot(e.clientX - touch.x0, e.clientY - touch.y0) > 10) touch.moved = true;
      wake();
      return;
    }
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.has = true;
    pointer.active = !isIgnored(e.target);
    wake();
  }

  function onPointerDown(e: PointerEvent) {
    if (e.pointerType !== "touch") return;
    touch.active = true;
    touch.moved = false;
    touch.x0 = e.clientX;
    touch.y0 = e.clientY;
    touch.t0 = performance.now();
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.has = true;
    pointer.active = false;
    wake();
  }

  function onPointerUp(e: PointerEvent) {
    if (e.pointerType !== "touch" || !touch.active) return;
    touch.active = false;
    const quick = performance.now() - touch.t0 < 350;
    const dist = Math.hypot(e.clientX - place.cx, e.clientY - place.cy);
    if (quick && !touch.moved && !reduced && !isIgnored(e.target) && dist < cfg.pointer.hoverRadius * place.radius) {
      dripPulse = 1.3;
    }
    wake();
  }

  function onPointerCancel(e: PointerEvent) {
    if (e.pointerType === "touch") touch.active = false;
  }

  function onPointerLeave() {
    pointer.active = false;
  }

  function onScroll() {
    rectsDirty = true;
    wake();
  }

  function onResize() {
    dpr = Math.min(window.devicePixelRatio || 1, cfg.render.dprCap[tier], Math.max(dpr, cfg.render.minDpr));
    renderer.setPixelRatio(dpr);
    resize();
    wake();
  }

  function onVisibility() {
    if (document.hidden) stop();
    else wake();
  }

  function onReducedChange() {
    reduced = reducedQuery.matches;
    stateSent = null;
    stop();
    if (reduced) {
      for (const s of strands) s.length = 0;
      for (const d of droplets) d.active = false;
    }
    wake();
  }

  let lostTimer = 0;
  function onContextLost(e: Event) {
    e.preventDefault();
    lost = true;
    stop();
    lostTimer = window.setTimeout(() => {
      if (!disposed) callbacks.onFatal();
    }, CONTEXT_RESTORE_TIMEOUT_MS);
  }

  function onContextRestored() {
    window.clearTimeout(lostTimer);
    lost = false;
    cleared = false;
    rectsDirty = true;
    wake();
  }

  const passive: AddEventListenerOptions = { passive: true };
  window.addEventListener("pointermove", onPointerMove, passive);
  window.addEventListener("pointerdown", onPointerDown, passive);
  window.addEventListener("pointerup", onPointerUp, passive);
  window.addEventListener("pointercancel", onPointerCancel, passive);
  document.documentElement.addEventListener("pointerleave", onPointerLeave, passive);
  window.addEventListener("scroll", onScroll, passive);
  window.addEventListener("resize", onResize, passive);
  document.addEventListener("visibilitychange", onVisibility);
  reducedQuery.addEventListener("change", onReducedChange);
  canvas.addEventListener("webglcontextlost", onContextLost);
  canvas.addEventListener("webglcontextrestored", onContextRestored);
  hostObserver.observe(host);

  resize();
  readRects();

  // Compile shaders without blocking the main thread (KHR_parallel_shader_compile),
  // then start drawing.
  renderer
    .compileAsync(scene, camera)
    .catch(() => undefined)
    .then(() => {
      if (disposed) return;
      if (shaderFailed) {
        callbacks.onFatal();
        return;
      }
      compiled = true;
      perfStart = performance.now();
      wake();
      loadActors();
    });

  // ---------------------------------------------------------------- dispose
  return {
    dispose() {
      if (disposed) return;
      disposed = true;
      stop();
      window.clearTimeout(lostTimer);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerCancel);
      document.documentElement.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      reducedQuery.removeEventListener("change", onReducedChange);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("webglcontextrestored", onContextRestored);
      anchorObserver.disconnect();
      hostObserver.disconnect();
      geometry.dispose();
      geometrySmall.dispose();
      material.dispose();
      dropletGeometry?.dispose();
      dropletMaterial?.dispose();
      dropletMesh?.dispose();
      loadAbort.abort();
      hand?.dispose();
      wordmark?.dispose();
      pour?.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
