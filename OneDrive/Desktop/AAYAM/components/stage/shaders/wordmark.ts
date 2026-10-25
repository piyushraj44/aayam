/**
 * Molten 3D wordmark material (docs/PROMPT-the-touch.md §4.3).
 *
 * Deep magenta-red body lit by an analytic warm studio (dark sky, warm
 * softboxes, a gold rim strip), glossy clearcoat Fresnel with a thin-film hue
 * shift on the rims, orange glow through the thin stroke edges, and the pour:
 * fragments above the letter's fill level are discarded and the fill front
 * glows molten gold.
 *
 * uv1.x = fillHeight (0 bottom → 1 top of the letter), uv1.y = distance from
 * the stroke centreline (0 centre → 1 silhouette edge). Both are renormalised
 * per letter at load time.
 */
export const wordmarkVertexShader = /* glsl */ `
attribute vec2 uv1;

varying vec3 vN;
varying vec3 vPos;
varying vec2 vFill;
varying vec3 vLocal;

void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vPos = world.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  vFill = uv1;
  vLocal = position;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const wordmarkFragmentShader = /* glsl */ `
#define PI 3.141592653589793

uniform float uFill[5];
uniform int uLetter;
uniform float uFrontWidth;
uniform float uFrontGlow;
uniform float uAlpha;
uniform float uTime;
uniform float uSweep;
uniform mat3 uEnvRot;

uniform vec3 uMagenta;
uniform vec3 uRed;
uniform vec3 uOrange;
uniform vec3 uGold;
uniform float uBody;
uniform float uRefl;
uniform float uGlow;
uniform float uIrid;
uniform float uUnitPx;      // px per model unit (to read the stroke's half-thickness)

varying vec3 vN;
varying vec3 vPos;
varying vec2 vFill;
varying vec3 vLocal;

float box(vec3 d, float az0, float el0, float hw, float hh, float soft) {
  float el = asin(clamp(d.y, -1.0, 1.0));
  float az = atan(d.x, d.z);
  float da = abs(mod(az - az0 + PI, 2.0 * PI) - PI) * cos(el);
  float de = abs(el - el0);
  return (1.0 - smoothstep(hw - soft, hw + soft, da)) * (1.0 - smoothstep(hh - soft, hh + soft, de));
}

vec3 warmStudio(vec3 d) {
  vec3 col = vec3(0.005, 0.003, 0.004) + vec3(0.03, 0.012, 0.01) * exp(-abs(d.y) * 6.0);
  // Warm key: a long, tilted strip rather than a box, so each tip catches a
  // differently shaped streak instead of the same elliptical ring.
  vec3 dk = vec3(d.x * 0.94 - d.y * 0.34, d.x * 0.34 + d.y * 0.94, d.z);
  col += vec3(1.0, 0.86, 0.66) * 2.6 * box(dk, -0.8, 0.55, 0.11, 0.6, 0.09);
  col += vec3(1.0, 0.72, 0.42) * 1.5 * box(d, 0.55, 0.85, 0.06, 0.45, 0.05);  // second strip, other angle
  col += vec3(1.0, 0.8, 0.62) * 0.9 * box(d, 0.15, 1.25, 1.3, 0.14, 0.14);   // soft overhead
  col += vec3(1.0, 0.6, 0.28) * 2.2 * box(d, 1.15, 0.22, 0.08, 0.5, 0.05);  // orange strip
  col += uGold * 3.2 * box(d, 2.75, -0.05, 0.7, 0.05, 0.035);               // gold rim strip
  col += uGold * 1.4 * box(d, -2.6, 0.35, 0.25, 0.06, 0.04);
  col += uRed * 0.3 * smoothstep(0.0, -0.5, d.y);                           // warm floor bounce
  // One slow specular sweep when the pour completes.
  float sw = sin(PI * clamp(uSweep, 0.0, 1.0));
  col += vec3(1.0, 0.92, 0.78) * 3.5 * sw * box(d, mix(-1.4, 1.4, uSweep), 0.3, 0.07, 1.3, 0.06);
  return col;
}

vec3 aces(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

void main() {
  float level = uFill[uLetter] * (1.0 + uFrontWidth);
  float h = vFill.x + 0.012 * sin(vLocal.x * 28.0 + uTime * 1.6) + 0.008 * sin(vLocal.z * 40.0 - uTime);
  if (h > level) discard;
  float front = smoothstep(level - uFrontWidth, level, h) * step(0.001, uFill[uLetter]) * (1.0 - step(0.999, uFill[uLetter]));

  vec3 N = normalize(vN);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(cameraPosition - vPos);
  float NdV = clamp(dot(N, V), 0.0, 1.0);
  vec3 R = uEnvRot * reflect(-V, N);

  // Body: magenta in the depths, red where it faces up, wrap-lit by the key.
  vec3 key = normalize(vec3(-0.5, 0.7, 0.6));
  float wrap = clamp((dot(N, key) + 0.45) / 1.45, 0.0, 1.0);
  // Magenta in the depths, red only where the surface faces the key; the
  // pockets fall off to near-black so the strokes read as sculpted.
  vec3 body = mix(uMagenta * 0.7, mix(uMagenta, uRed, 0.45), clamp(-0.1 + 0.35 * N.y + 0.45 * wrap, 0.0, 1.0));
  float pocket = smoothstep(0.0, 0.55, wrap) * mix(0.55, 1.0, NdV);
  vec3 col = body * (0.025 + 0.6 * wrap * wrap) * pocket * uBody;

  // Fake thickness / transmission: the balloon surface is flatter where the
  // stroke is thin (|z| small), so light glows orange through tips and necks
  // when seen face-on (not as an outline at the silhouette).
  float halfThick = abs(vPos.z) / max(uUnitPx, 1e-3);
  float thin = 1.0 - smoothstep(0.012, 0.05, halfThick);
  col += uOrange * uGlow * thin * (0.08 + 0.55 * NdV) * mix(0.6, 1.0, vFill.y);

  // Clearcoat with a gold tint and a thin-film hue shift on the rims.
  vec3 env = warmStudio(R);
  float F = 0.04 + 0.96 * pow(1.0 - NdV, 5.0);
  vec3 film = 0.55 + 0.45 * cos(2.0 * PI * (vec3(0.0, 0.33, 0.67) + (1.0 - NdV) * 1.4 + uTime * 0.02));
  vec3 tint = mix(vec3(1.0), uGold * 1.3, 0.45);
  col += env * tint * mix(vec3(1.0), film * 1.3, uIrid * pow(1.0 - NdV, 1.5)) * (0.08 + F) * uRefl;
  // Gold specular: the bright part of the reflection, tinted gold.
  col += max(env - 0.5, 0.0) * uGold * 0.5 * uRefl;

  // Molten fill front.
  col += mix(uOrange, uGold, front) * front * uFrontGlow;

  col = pow(aces(col), vec3(1.0 / 2.2));
  gl_FragColor = vec4(col * uAlpha, uAlpha);
}
`;
