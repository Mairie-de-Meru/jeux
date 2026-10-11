// Module PUR : pigments et mélange spectral soustractif (approximation Beer-Lambert).
export const BANDS = 8;

export const PIGMENTS = {
  rouge: { id: 'rouge', nom: 'Rouge', reflectance: [0.04, 0.15, 0.02, 0.02, 0.02, 0.56, 0.9, 0.9] },
  jaune: { id: 'jaune', nom: 'Jaune', reflectance: [0.03, 0.04, 0.12, 0.7, 0.92, 0.95, 0.95, 0.95] },
  bleu: { id: 'bleu', nom: 'Bleu', reflectance: [0.87, 0.9, 0.02, 0.65, 0.15, 0.02, 0.02, 0.02] },
  blanc: { id: 'blanc', nom: 'Blanc', reflectance: [0.9, 0.92, 0.93, 0.93, 0.93, 0.93, 0.92, 0.9] },
  noir: { id: 'noir', nom: 'Noir', reflectance: [0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05] },
};

export const PIGMENT_IDS = Object.keys(PIGMENTS);

// Poids bande -> canal linéaire (colonnes normalisées : réflectance 1 partout = blanc).
const W = {
  r: [0, 0, 0, 0, 0, 0.25, 0.9, 0.8],
  g: [0, 0, 0.3, 0.9, 0.9, 0.3, 0, 0],
  b: [0.7, 1, 0.45, 0.1, 0, 0, 0, 0],
};
for (const k of Object.keys(W)) {
  const s = W[k].reduce((a, b) => a + b, 0);
  W[k] = W[k].map((v) => v / s);
}

export function mixReflectance(counts) {
  let total = 0;
  for (const id of PIGMENT_IDS) total += counts[id] || 0;
  if (total <= 0) return null;
  const out = new Array(BANDS).fill(0);
  for (let i = 0; i < BANDS; i++) {
    let logSum = 0;
    for (const id of PIGMENT_IDS) {
      const n = counts[id] || 0;
      if (n > 0) logSum += n * Math.log(PIGMENTS[id].reflectance[i]);
    }
    out[i] = Math.exp(logSum / total);
  }
  return out;
}

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
function gamma(x) {
  x = clamp(x, 0, 1);
  return x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
}

export function reflectanceToRgb(refl) {
  const lin = ['r', 'g', 'b'].map((c) => refl.reduce((a, v, i) => a + v * W[c][i], 0));
  const [r, g, b] = lin.map((v) => Math.round(gamma(v) * 255));
  return { r, g, b };
}

export function mixToRgb(counts) {
  const refl = mixReflectance(counts);
  return refl ? reflectanceToRgb(refl) : null;
}

const h2 = (n) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0');
export function rgbToHex({ r, g, b }) {
  return '#' + h2(r) + h2(g) + h2(b);
}

export function rgbToLab({ r, g, b }) {
  const lin = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  const [R, G, B] = lin;
  const X = (0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047;
  const Y = 0.2126 * R + 0.7152 * G + 0.0722 * B;
  const Z = (0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(X), fy = f(Y), fz = f(Z);
  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

export function deltaE(rgbA, rgbB) {
  const a = rgbToLab(rgbA), b = rgbToLab(rgbB);
  return Math.hypot(a.L - b.L, a.a - b.a, a.b - b.b);
}
