/**
 * ASCII hand: one instanced quad per glyph cell, positioned in CSS pixels.
 *
 * Per instance: aCell = (col, row); aData = (brightness 0–1, tint 0/1/2,
 * finger index + 1 (0 = palm), sway weight); aExtra = (distance to the contact
 * fingertip in rows, drip-line flag, random phase, random 0–1).
 *
 * The whole grid is rotated about the contact fingertip (uRot) and translated
 * so that fingertip lands on uTip — the stage only has to say where the tip is.
 */
export const glyphVertexShader = /* glsl */ `
uniform vec2 uViewport;
uniform vec2 uTip;
uniform vec2 uTipLocal;
uniform vec2 uCell;
uniform float uRot;
uniform float uTime;
uniform float uOpacity;
uniform float uBright;
uniform float uFlicker;
uniform float uTipGlow;
uniform float uFlash;
uniform float uFlashRadius;
uniform float uRain;
uniform float uTopFade;
uniform float uHeaderDim;
uniform float uRampLen;
uniform vec2 uSway[5];
uniform vec3 uWhite;
uniform vec3 uRed;
uniform vec3 uBlue;
uniform vec3 uGold;

attribute vec2 aCell;
attribute vec4 aData;
attribute vec4 aExtra;

varying vec2 vUv;
varying float vGlyph;
varying vec3 vColor;
varying float vAlpha;

void main() {
  vec2 cell = aCell;
  int finger = int(aData.z + 0.5);
  if (finger > 0) cell += uSway[finger - 1] * pow(aData.w, 1.5);

  // Drip-line glyphs fall as streams during the pour.
  float rain = 0.0;
  if (aExtra.y > 0.5 && uRain > 0.001) {
    rain = fract(uTime * 0.9 + aExtra.z);
    cell.y += uRain * rain * 7.0;
  }

  vec2 local = (cell + 0.5 - uTipLocal) * uCell + vec2(position.x, -position.y) * uCell;
  float c = cos(uRot);
  float s = sin(uRot);
  vec2 screen = uTip + vec2(c * local.x - s * local.y, s * local.x + c * local.y);

  float b = aData.x * uBright;
  b *= 1.0 + uFlicker * sin(uTime * (1.7 + aExtra.w * 2.6) + aExtra.z * 6.2831);
  b += uTipGlow * exp(-aExtra.x / 9.0);

  // Contact: a single warm-gold ring travelling outward from the fingertip.
  float ring = uFlash * exp(-pow((aExtra.x - uFlashRadius) / 3.5, 2.0));
  b += ring * 0.8;

  vec3 col = uWhite;
  if (aData.y > 1.5) col = uBlue;
  else if (aData.y > 0.5) col = uRed;
  col = mix(col, uGold, clamp(ring * 1.4, 0.0, 1.0));

  vGlyph = floor(clamp(b, 0.12, 1.0) * (uRampLen - 1.0) + 0.5);
  vColor = col;
  vAlpha = uOpacity * mix(0.45, 1.0, clamp(b, 0.0, 1.0)) * (1.0 - rain * uRain);
  // Keep the header readable: glyphs dim toward the top edge.
  vAlpha *= mix(uHeaderDim, 1.0, smoothstep(uTopFade * 0.75, uTopFade * 1.35, screen.y));
  vUv = uv;

  vec3 world = vec3(screen.x - uViewport.x * 0.5, uViewport.y * 0.5 - screen.y, 0.0);
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}
`;

export const glyphFragmentShader = /* glsl */ `
uniform sampler2D uAtlas;
uniform float uRampLen;

varying vec2 vUv;
varying float vGlyph;
varying vec3 vColor;
varying float vAlpha;

void main() {
  float m = texture2D(uAtlas, vec2((vGlyph + vUv.x) / uRampLen, vUv.y)).r;
  float a = m * vAlpha;
  if (a < 0.003) discard;
  gl_FragColor = vec4(vColor * a, a);   // premultiplied
}
`;
