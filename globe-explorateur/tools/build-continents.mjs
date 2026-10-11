// Produit src/data/continents.js depuis Natural Earth 1:110m Admin 0 (domaine public).
// Usage : node tools/build-continents.mjs
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const URL_SRC = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson';
const OUT = fileURLToPath(new URL('../src/data/continents.js', import.meta.url));
const TOL = 0.4;      // tolérance Douglas-Peucker (degrés)
const MIN_AREA = 1.5;  // anneaux plus petits (deg²) supprimés
const LABELS = { FRA: 'france', BEL: 'belgique', CHE: 'suisse', CAN: 'canada', SEN: 'senegal', JPN: 'japon', BRA: 'bresil' };

const MAP = { 'Africa': 'afrique', 'Europe': 'europe', 'Asia': 'asie', 'Oceania': 'oceanie',
  'North America': 'amerique', 'South America': 'amerique', 'Antarctica': 'antarctique' };

// Sutherland-Hodgman contre le demi-plan lon <= x (side=-1) ou lon >= x (side=1)
function clipLon(ring, x, side) {
  const inside = (p) => (side < 0 ? p[0] <= x : p[0] >= x);
  const out = [];
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length];
    const ia = inside(a), ib = inside(b);
    const cut = () => { const t = (x - a[0]) / (b[0] - a[0]); return [x, a[1] + t * (b[1] - a[1])]; };
    if (ia && ib) out.push(b);
    else if (ia && !ib) out.push(cut());
    else if (!ia && ib) { out.push(cut()); out.push(b); }
  }
  return out;
}

// Anneau traversant l'antiméridien : on déroule puis on coupe en deux.
function splitAntimeridian(ring) {
  let jump = false;
  for (let i = 0; i < ring.length; i++) {
    if (Math.abs(ring[i][0] - ring[(i + 1) % ring.length][0]) > 180) jump = true;
  }
  if (!jump) return [ring];
  const un = ring.map(([lo, la]) => [lo < 0 ? lo + 360 : lo, la]);
  const east = clipLon(un, 180, -1);
  const west = clipLon(un, 180, 1).map(([lo, la]) => [lo - 360, la]);
  return [east, west].filter((r) => r.length >= 3);
}

function dp(pts, tol) {
  if (pts.length < 3) return pts;
  const d2 = (p, a, b) => {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const l = dx * dx + dy * dy;
    let t = l ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l : 0;
    t = Math.max(0, Math.min(1, t));
    const x = a[0] + t * dx - p[0], y = a[1] + t * dy - p[1];
    return x * x + y * y;
  };
  let max = 0, idx = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = d2(pts[i], pts[0], pts[pts.length - 1]);
    if (d > max) { max = d; idx = i; }
  }
  if (max > tol * tol) {
    const l = dp(pts.slice(0, idx + 1), tol), r = dp(pts.slice(idx), tol);
    return l.slice(0, -1).concat(r);
  }
  return [pts[0], pts[pts.length - 1]];
}

function simplifyRing(ring) {
  // fermer proprement : retirer le point de fermeture dupliqué
  let r = ring.slice();
  const f = r[0], l = r[r.length - 1];
  if (f[0] === l[0] && f[1] === l[1]) r.pop();
  // DP sur anneau : coupe en deux au point le plus éloigné du premier
  let far = 0, fd = -1;
  r.forEach((p, i) => { const d = (p[0] - r[0][0]) ** 2 + (p[1] - r[0][1]) ** 2; if (d > fd) { fd = d; far = i; } });
  const a = dp(r.slice(0, far + 1), TOL), b = dp(r.slice(far).concat([r[0]]), TOL);
  let s = a.slice(0, -1).concat(b.slice(0, -1));
  s = s.map(([lo, la]) => [Math.round(lo * 10) / 10, Math.round(la * 10) / 10]);
  return s;
}

function area(r) {
  let a = 0;
  for (let i = 0; i < r.length; i++) { const p = r[i], q = r[(i + 1) % r.length]; a += p[0] * q[1] - q[0] * p[1]; }
  return Math.abs(a / 2);
}

const res = await fetch(URL_SRC);
if (!res.ok) throw new Error('Téléchargement impossible : ' + res.status);
const gj = await res.json();

const acc = { afrique: [], amerique: [], antarctique: [], asie: [], europe: [], oceanie: [] };
const labels = {};
for (const f of gj.features) {
  const p = f.properties;
  const iso = p.ADM0_A3 || p.ISO_A3;
  if (LABELS[iso]) labels[LABELS[iso]] = { lat: p.LABEL_Y, lon: p.LABEL_X };
  let cont = MAP[p.CONTINENT];
  if (!cont) continue; // Seven seas (open sea)
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  for (const poly of polys) {
    const outer = poly[0];
    let target = cont;
    const cx = outer.reduce((s, q) => s + q[0], 0) / outer.length;
    const cy = outer.reduce((s, q) => s + q[1], 0) / outer.length;
    if (iso === 'FRA' && cx < -20) target = 'amerique'; // Guyane
    for (const piece of splitAntimeridian(outer)) {
      if (iso === 'RUS') {
        const minLon = Math.min(...piece.map((q) => q[0]));
        if (minLon < -100) { acc.asie.push(piece); continue; } // Tchoukotka
        const w = clipLon(piece, 60, -1), e = clipLon(piece, 60, 1);
        if (w.length >= 3) acc.europe.push(w);
        if (e.length >= 3) acc.asie.push(e);
      } else acc[target].push(piece);
    }
  }
}

const out = {};
let total = 0;
for (const [k, rings] of Object.entries(acc)) {
  out[k] = rings.map(simplifyRing).filter((r) => r.length >= 3 && area(r) >= MIN_AREA);
  total += out[k].reduce((s, r) => s + r.length, 0);
}
const header = `// Généré par tools/build-continents.mjs — ne pas modifier à la main.
// Source : Natural Earth 1:110m Admin 0 Countries (naturalearthdata.com), domaine public.
// Fichier ne_110m_admin_0_countries.geojson du dépôt github.com/nvkelso/natural-earth-vector.
// Regroupé par continent (Amérique = Nord + Sud), Russie coupée à 60° E, Douglas-Peucker ${TOL}°, arrondi 0,1°.
// Anneaux [lon, lat], aucun ne traverse l'antiméridien.
`;
const body = 'export const CONTINENTS = {\n' + Object.entries(out)
  .map(([k, rs]) => `  ${k}: [\n` + rs.map((r) => '    ' + JSON.stringify(r)).join(',\n') + '\n  ]').join(',\n') + '\n};\n';
writeFileSync(OUT, header + body);
console.log('points', total, 'labels', JSON.stringify(labels));
for (const k in out) console.log(k, out[k].length, 'anneaux');
