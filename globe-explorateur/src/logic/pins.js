// Logique pure des figurines : fondu au limbe, écartement des voisines, ancrage sur le contenu opaque.
import { angularDistance, normLon } from './geo.js';

const smooth = (t) => t * t * (3 - 2 * t);

// dot = normale monde · direction vers la caméra. Opaque au-dessus de 0.35, invisible sous 0.05.
export function limbAlpha(dot) {
  if (dot >= 0.35) return 1;
  if (dot <= 0.05) return 0;
  return smooth((dot - 0.05) / 0.3);
}

// Écarte les pins plus proches que `seuil` degrés : léger déplacement en lat/lon, et échelle réduite.
// entrées : [{ id, lat, lon }] -> { id: { lat, lon, echelle } }. Déterministe.
export function espacer(pins, seuil = 8) {
  const out = {};
  for (const p of pins) out[p.id] = { lat: p.lat, lon: p.lon, echelle: 1 };
  for (let i = 0; i < pins.length; i++) {
    for (let j = i + 1; j < pins.length; j++) {
      const a = pins[i], b = pins[j];
      const d = angularDistance(a, b);
      if (d >= seuil) continue;
      out[a.id].echelle = 0.8; out[b.id].echelle = 0.8;
      const push = (seuil - d) / 2 * 0.6;
      let dlat = a.lat - b.lat, dlon = normLon(a.lon - b.lon) * Math.cos(((a.lat + b.lat) / 2) * Math.PI / 180);
      let n = Math.hypot(dlat, dlon);
      if (n < 1e-6) { dlat = 0; dlon = 1; n = 1; }
      const ul = dlat / n, uo = dlon / n / Math.max(0.2, Math.cos(((a.lat + b.lat) / 2) * Math.PI / 180));
      out[a.id].lat += ul * push; out[a.id].lon = normLon(out[a.id].lon + uo * push);
      out[b.id].lat -= ul * push; out[b.id].lon = normLon(out[b.id].lon - uo * push);
    }
  }
  return out;
}

// Boîte englobante du contenu opaque (alpha > seuil) dans des données RGBA. Fractions 0..1, y depuis le haut.
export function boiteOpaque(data, w, h, seuil = 16) {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (data[(y * w + x) * 4 + 3] > seuil) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  if (x1 < 0) return { x0: 0, y0: 0, x1: 1, y1: 1 };
  return { x0: x0 / w, y0: y0 / h, x1: (x1 + 1) / w, y1: (y1 + 1) / h };
}

// Réglage d'un sprite à partir de sa boîte : ancre (0.5, 1 - y1) pour que le pied touche le sol,
// hauteur de texture telle que le contenu mesure `hauteurContenu` (borné pour les contenus minuscules).
export function reglageSprite(boite, hauteurContenu = 0.3) {
  const frac = Math.max(0.6, Math.min(1, boite.y1 - boite.y0));
  return { centerY: 1 - boite.y1, hauteur: hauteurContenu / frac };
}
