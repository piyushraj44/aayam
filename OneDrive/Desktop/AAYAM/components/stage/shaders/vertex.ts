import { simplexNoise } from "./noise";

/**
 * Vertex shader of the stage object.
 *
 * The mesh is a unit geodesic sphere; every vertex is treated as a direction
 * `n` and pushed to its final position by `stageSurface(n)`:
 *
 *   1. objectSurface — in object space:
 *        radius = base radius + liquid ripples (domain-warped simplex noise)
 *               + Σ spike lobes (tapered cones around Fibonacci axes)
 *        plus sideways petal bulge and per-spike bend/sway.
 *   2. uRot rotates the result into "stage space" (object centre at origin,
 *      +y up, +z toward the viewer, units = object radius).
 *   3. applyRing — the one-shot contact ripple ring travelling over the surface.
 *   4. applyStrands — liquid strands: drips hang straight down (−y in stage
 *      space, so they always drip toward the floor whatever the rotation) and
 *      the tendril is pulled out toward the hand's fingertip.
 *
 * Normals are recomputed by evaluating the same function at two neighbouring
 * directions along the sphere's tangents (forward finite differences), so the
 * lighting follows every deformation.
 */
export const stageVertexShader = /* glsl */ `
#define PI 3.141592653589793

uniform float uTime;        // ripple clock (already multiplied by speed)
uniform float uRippleAmp;
uniform float uRippleFreq;
uniform float uBaseRadius;
uniform float uEps;         // finite-difference step (≈ half the vertex spacing)
uniform mat3 uRot;

uniform int uSpikeCount;
uniform vec4 uSpikeAxis[MAX_SPIKES];   // xyz: unit axis (object space), w: current length
uniform vec4 uSpikeShape[MAX_SPIKES];  // xyz: bend vector (object space), w: root chord width
uniform float uSpikeTaper;
uniform float uPetalBulge;

uniform int uDripCount;
uniform vec4 uDrip[MAX_DRIPS];         // xyz: unit anchor direction (stage space), w: length
uniform vec3 uDripShape;               // x: bead radius, y: neck radius, z: root chord width

// Tendril reaching up to the hand's fingertip (stage space), same strand model.
uniform vec4 uTendril;                 // xyz: unit anchor/pull direction, w: length (0 = off)
uniform vec3 uTendrilShape;            // x: bead radius, y: neck radius, z: root chord width

// Contact ripple ring (stage space).
uniform vec4 uRippleRing;              // xyz: origin direction, w: progress 0–1 (0 = off)
uniform float uRingAmp;

varying vec3 vNormalW;
varying vec3 vPosW;
varying float vRipple;
varying float vSpike;

${simplexNoise}

// Slow, organic liquid-metal ripples: simplex noise sampled through a
// noise-warped domain gives the folded, flowing ridges of the reference.
float liquid(vec3 n) {
  vec3 q = n * uRippleFreq;
  float t = uTime;
#if QUALITY >= 1
  vec3 w = vec3(
    snoise(q * 0.65 + vec3(0.0, t * 0.6, 0.0)),
    snoise(q * 0.65 + vec3(5.2, 1.3 - t * 0.5, 2.8)),
    snoise(q * 0.65 + vec3(-3.1, 7.7, t * 0.45)));
#else
  float w1 = snoise(q * 0.65 + vec3(0.0, t * 0.6, 0.0));
  vec3 w = vec3(w1, -w1, 0.5 * w1);
#endif
  float h = snoise(q + w * 0.85 + vec3(0.0, 0.0, t));
  // Fold part of the field into soft creases (1 - |n|, smoothed so normals
  // stay continuous) for liquid-metal ridges.
  h = mix(h, 0.6 - sqrt(h * h + 0.03) * 1.6, 0.35);
#if QUALITY >= 2
  h += 0.22 * snoise(q * 2.2 + w * 1.3 - vec3(t * 0.7, 0.0, 0.0));
#endif
  return h;
}

vec3 objectSurface(vec3 n, out float ripple, out float spike) {
  ripple = uRippleAmp > 0.0001 ? liquid(n) : 0.0;
  float radial = 0.0;
  vec3 lateral = vec3(0.0);
  spike = 0.0;

  for (int i = 0; i < MAX_SPIKES; i++) {
    if (i >= uSpikeCount) break;
    vec4 ax = uSpikeAxis[i];
    vec4 sh = uSpikeShape[i];
    if (ax.w <= 0.0) continue;
    // Chord distance to the axis is precise near the tip (acos is not).
    float t = length(n - ax.xyz) / sh.w;
    if (t >= 1.0) continue;
    float s = pow(1.0 - t, uSpikeTaper);   // 0 at the root rim, 1 at the tip
    radial += ax.w * s;
    // Swell sideways around mid-height: cones become tapered petals.
    vec3 away = n - ax.xyz * dot(n, ax.xyz);
    float al = length(away);
    if (al > 1e-5) lateral += (away / al) * (uPetalBulge * ax.w * sin(PI * s));
    // Bend / sway grows quadratically toward the tip.
    lateral += sh.xyz * (s * s * ax.w);
    spike = max(spike, s * min(ax.w, 1.0));
  }

  return n * (uBaseRadius + ripple * uRippleAmp + radial) + lateral;
}

// A liquid strand pulled out of the surface along "axis": thick at the root,
// thinning to a neck, with a round bead at the tip. It re-maps the vertices of
// a small cap of the sphere around "anchor" (u = 0 at the axis, 1 at the rim).
vec3 strand(vec3 p, vec3 nr, vec3 anchor, vec3 axis, float L, vec3 shape, float profile) {
  const float UB = 0.28;            // inner part of the cap that becomes the bead
  float u = length(nr - anchor) / shape.z;
  if (u >= 1.0 || L <= 0.001) return vec3(0.0);
  float b = min(shape.x, L * 0.3);
  float neck = min(shape.y, b * 0.7);
  vec3 v = (nr - anchor) * length(p);
  vec3 vp = v - axis * dot(v, axis);   // offset across the strand axis
  float hl = length(vp);
  vec3 dir = hl > 1e-6 ? vp / hl : vec3(0.0);

  float depth;
  float lat;
  if (u > UB) {
    float s = (u - UB) / (1.0 - UB);
    depth = (L - 2.0 * b) * pow(1.0 - s, profile);
    lat = mix(neck, hl, pow(s, 0.7));
  } else {
    float a = PI * (1.0 - u / UB);    // PI at the far end of the bead, 0 at its neck
    depth = (L - b) - b * cos(a);
    lat = b * sin(a) + neck * (u / UB);
  }
  return dir * lat - vp + axis * depth;
}

vec3 applyStrands(vec3 p, vec3 nr) {
  vec3 offset = vec3(0.0);
#if MAX_DRIPS > 0
  for (int j = 0; j < MAX_DRIPS; j++) {
    if (j >= uDripCount) break;
    vec4 d = uDrip[j];
    offset += strand(p, nr, d.xyz, vec3(0.0, -1.0, 0.0), d.w, uDripShape, 2.2);
  }
#endif
  offset += strand(p, nr, uTendril.xyz, uTendril.xyz, uTendril.w, uTendrilShape, 1.7);
  return p + offset;
}

// One chrome ripple ring travelling away from the contact point.
vec3 applyRing(vec3 p, vec3 nr) {
  if (uRippleRing.w <= 0.0 || uRippleRing.w >= 1.0) return p;
  float ang = acos(clamp(dot(nr, uRippleRing.xyz), -1.0, 1.0));
  float front = uRippleRing.w * PI * 1.15;
  float env = (1.0 - uRippleRing.w) * (1.0 - uRippleRing.w);
  float bump = exp(-pow((ang - front) / 0.16, 2.0));
  return p + nr * (uRingAmp * env * bump);
}

vec3 stageSurface(vec3 n, out float ripple, out float spike) {
  vec3 p = uRot * objectSurface(n, ripple, spike);
  vec3 nr = uRot * n;
  p = applyRing(p, nr);
  if (uDripCount > 0 || uTendril.w > 0.001) p = applyStrands(p, nr);
  return p;
}

void main() {
  vec3 n = normalize(position);
  vec3 helper = abs(n.y) < 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
  vec3 t1 = normalize(cross(helper, n));
  vec3 t2 = cross(n, t1);           // cross(t1, t2) == n  → outward normal

  float ripple;
  float spike;
  float r1;
  float s1;
  vec3 p0 = stageSurface(n, ripple, spike);
  vec3 pa = stageSurface(normalize(n + t1 * uEps), r1, s1);
  vec3 pb = stageSurface(normalize(n + t2 * uEps), r1, s1);
  vec3 nrm = normalize(cross(pa - p0, pb - p0));

  vec4 world = modelMatrix * vec4(p0, 1.0);
  vPosW = world.xyz;
  vNormalW = normalize(mat3(modelMatrix) * nrm);   // uniform scale only
  vRipple = ripple;
  vSpike = spike;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

/** Detached droplets: plain instanced spheres sharing the fragment shader. */
export const dropletVertexShader = /* glsl */ `
varying vec3 vNormalW;
varying vec3 vPosW;
varying float vRipple;
varying float vSpike;

void main() {
  vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);
  vPosW = world.xyz;
  vNormalW = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
  vRipple = 0.6;
  vSpike = 0.0;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;
