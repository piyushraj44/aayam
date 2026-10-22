/**
 * Fragment shader: analytic studio environment, no textures.
 *
 * chrome (morph 0) — a polished metal reflecting a dark photo studio: near-black
 *   sky, a few soft-edged white softbox / strip lights and a bright cool-white
 *   floor below the horizon (Reference Image 2). Schlick Fresnel with a cool
 *   metallic F0, a sharp key-light hotspot and cavity darkening in ripple troughs.
 *
 * burst (morph 1) — black glossy glass: a dielectric Fresnel picks up thin red /
 *   blue / cyan strip lights at the rims; each RGB channel samples the
 *   environment with a slightly different normal for chromatic dispersion.
 *
 * Output is ACES-tonemapped and gamma-encoded here (the renderer applies none).
 */
export const stageFragmentShader = /* glsl */ `
#define PI 3.141592653589793

uniform float uMorph;
uniform mat3 uEnvRot;

uniform vec3 uTint;
uniform float uBright;
uniform float uContrast;
uniform float uStrip;
uniform float uFloor;
uniform float uSpecular;

uniform vec3 uRed;
uniform vec3 uBlue;
uniform vec3 uCyan;
uniform float uDispersion;
uniform float uBurstGain;
uniform vec4 uBloom;          // xyz: contact point (world px), w: strength
uniform float uBloomRadius;   // px

varying vec3 vNormalW;
varying vec3 vPosW;
varying float vRipple;
varying float vSpike;

// Soft-edged rectangular light in (azimuth, elevation) space.
// azimuth 0 = toward the viewer (+z), positive toward +x.
float box(vec3 d, float az0, float el0, float hw, float hh, float soft) {
  float el = asin(clamp(d.y, -1.0, 1.0));
  float az = atan(d.x, d.z);
  float da = abs(mod(az - az0 + PI, 2.0 * PI) - PI) * cos(el);
  float de = abs(el - el0);
  return (1.0 - smoothstep(hw - soft, hw + soft, da)) * (1.0 - smoothstep(hh - soft, hh + soft, de));
}

vec3 studio(vec3 d) {
  float y = d.y;
  // Dark studio sky, a touch lighter toward the horizon.
  vec3 col = mix(vec3(0.004, 0.005, 0.007), vec3(0.03, 0.033, 0.042), exp(-max(y, 0.0) * 4.0));
  // Glow where the floor meets the backdrop.
  col += vec3(0.55, 0.58, 0.68) * exp(-abs(y) * 18.0) * 0.5 * uFloor;

  // Cool-white floor, set well below the horizon so only the lower rim of
  // the orb catches it; it falls off to near-black toward the pole so the
  // ripples keep their black/white contrast across the lower half.
  float floorMask = smoothstep(-0.18, -0.32, y);
  vec3 floorCol = mix(vec3(1.05, 1.07, 1.15), vec3(0.1, 0.105, 0.13), smoothstep(-0.28, -0.75, y));
  col = mix(col, floorCol * uFloor, floorMask);

  // Softboxes and strip lights.
  float s = 0.0;
  s += 3.0 * box(d, 0.0, 1.2, 1.7, 0.2, 0.07);      // wide overhead softbox
  s += 4.2 * box(d, -1.05, 0.38, 0.1, 0.5, 0.05);   // key strip, front-left
  s += 2.6 * box(d, 1.2, 0.3, 0.07, 0.42, 0.045);   // fill strip, front-right
  s += 1.4 * box(d, 0.3, 0.62, 0.32, 0.05, 0.035);  // thin horizontal strip
  s += 2.4 * box(d, 0.05, 0.82, 0.55, 0.09, 0.05);  // high frontal softbox
  s += 2.0 * box(d, 2.55, 0.15, 0.22, 0.32, 0.06);  // rim, back-right
  s += 2.0 * box(d, -2.6, 0.22, 0.18, 0.28, 0.06);  // rim, back-left
  s += 2.4 * box(d, 0.0, -0.45, 2.4, 0.03, 0.02);   // thin floor reflector strips:
  s += 1.8 * box(d, 0.8, -0.68, 1.3, 0.028, 0.018); // ripple troughs catch them
  s += 1.5 * box(d, -0.9, -0.6, 0.9, 0.025, 0.018);
  col += vec3(0.95, 0.98, 1.05) * s * uStrip;
  return col;
}

vec3 burstEnv(vec3 d) {
  vec3 col = vec3(0.0015, 0.0015, 0.003);
  col += uRed * 3.6 * box(d, -1.3, 0.2, 0.2, 0.85, 0.08);
  col += uBlue * 4.2 * box(d, 1.2, 0.05, 0.24, 0.9, 0.09);
  col += uCyan * 3.0 * box(d, 0.45, 0.95, 0.07, 0.25, 0.035);
  // Hard white specular streaks.
  col += vec3(1.0) * 10.0 * box(d, -0.55, 0.62, 0.045, 0.4, 0.015);
  col += vec3(1.0) * 7.0 * box(d, 0.15, 0.25, 0.035, 0.55, 0.012);
  col += vec3(1.0) * 6.0 * box(d, 0.9, -0.25, 0.035, 0.35, 0.012);
  col += uRed * 2.4 * box(d, 2.6, -0.1, 0.3, 0.5, 0.12);            // back rims
  col += uBlue * 2.2 * box(d, -2.5, 0.3, 0.28, 0.55, 0.12);
  col += uCyan * 1.2 * box(d, 3.1, 0.6, 0.15, 0.22, 0.08);
  col += uRed * 0.03 * smoothstep(0.0, -0.4, d.y);
  return col;
}

vec3 aces(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

void main() {
  vec3 N = normalize(vNormalW);
  vec3 V = normalize(cameraPosition - vPosW);
  float NdV = clamp(dot(N, V), 0.0, 1.0);
  vec3 R = uEnvRot * reflect(-V, N);

  float mat = smoothstep(0.2, 0.85, uMorph + vSpike * 0.15);

  // --- liquid chrome ---
  vec3 chrome = vec3(0.0);
  if (mat < 0.999) {
    vec3 env = pow(studio(R), vec3(uContrast));
    vec3 F = uTint + (1.0 - uTint) * pow(1.0 - NdV, 5.0);
    chrome = env * F;
    chrome += vec3(1.0, 0.99, 0.97) * pow(max(dot(R, normalize(vec3(-0.45, 0.78, 0.45))), 0.0), 900.0) * 8.0 * uSpecular;
    chrome *= mix(0.6, 1.0, smoothstep(-0.9, 0.7, vRipple));   // ripple troughs
    chrome *= uBright;
  }

  // --- chromatic black glass ---
  vec3 burst = vec3(0.0);
  if (mat > 0.001) {
    vec3 o = N - V * dot(N, V);
    vec3 Rr = uEnvRot * reflect(-V, normalize(N - o * uDispersion));
    vec3 Rb = uEnvRot * reflect(-V, normalize(N + o * uDispersion));
    vec3 c = vec3(burstEnv(Rr).r, burstEnv(R).g, burstEnv(Rb).b);
    float fres = 0.06 + 0.94 * pow(1.0 - NdV, 3.5);
    burst = c * fres * uBurstGain;
    burst *= mix(0.3, 1.0, smoothstep(0.0, 0.3, vSpike));     // dark body between petals
    burst += vec3(0.004, 0.004, 0.006);
  }

  vec3 col = mix(chrome, burst, mat);
  // Soft white specular bloom where the fingertip touched.
  if (uBloom.w > 0.001) {
    vec3 dp = vPosW - uBloom.xyz;
    col += vec3(1.0, 0.98, 0.95) * uBloom.w * exp(-dot(dp, dp) / (uBloomRadius * uBloomRadius));
  }
  col = pow(aces(col), vec3(1.0 / 2.2));
  gl_FragColor = vec4(col, 1.0);
}
`;
