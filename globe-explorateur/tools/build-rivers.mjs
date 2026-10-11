// Produit src/data/rivers.js depuis Natural Earth 1:50m rivers_lake_centerlines (domaine public).
// Usage : node tools/build-rivers.mjs
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const URL_SRC = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_rivers_lake_centerlines.geojson';
const OUT = fileURLToPath(new URL('../src/data/rivers.js', import.meta.url));
const TOL = 0.06; // Douglas-Peucker, degrés

// id du jeu -> { nom, continent, noms Natural Earth regroupés }
const FLEUVES = {
  nil: { nom: 'le Nil', continent: 'afrique', ne: ['Nile'] },
  amazone: { nom: "l'Amazone", continent: 'amerique', ne: ['Amazonas'] },
  mississippi: { nom: 'le Mississippi', continent: 'amerique', ne: ['Mississippi', 'Missouri'] },
  yangtse: { nom: 'le Yangtsé', continent: 'asie', ne: ['Yangtze', 'Chang Jiang'] },
  gange: { nom: 'le Gange', continent: 'asie', ne: ['Ganges'] },
  mekong: { nom: 'le Mékong', continent: 'asie', ne: ['Mekong'] },
  congo: { nom: 'le Congo', continent: 'afrique', ne: ['Congo'] },
  niger: { nom: 'le Niger', continent: 'afrique', ne: ['Niger'] },
  danube: { nom: 'le Danube', continent: 'europe', ne: ['Donau', 'Danube'] },
  volga: { nom: 'la Volga', continent: 'europe', ne: ['Volga'] },
  murray: { nom: 'le Murray', continent: 'oceanie', ne: ['Murray', 'Darling'] },
  saintLaurent: { nom: 'le Saint-Laurent', continent: 'amerique', ne: ['St. Lawrence'] },
};

function dp(pts, tol) {
  if (pts.length < 3) return pts;
  const [a, b] = [pts[0], pts[pts.length - 1]];
  const dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy;
  let max = 0, idx = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    let t = l ? ((pts[i][0] - a[0]) * dx + (pts[i][1] - a[1]) * dy) / l : 0;
    t = Math.max(0, Math.min(1, t));
    const d = Math.hypot(a[0] + t * dx - pts[i][0], a[1] + t * dy - pts[i][1]);
    if (d > max) { max = d; idx = i; }
  }
  if (max > tol) return dp(pts.slice(0, idx + 1), tol).slice(0, -1).concat(dp(pts.slice(idx), tol));
  return [a, b];
}

const res = await fetch(URL_SRC);
if (!res.ok) throw new Error('téléchargement : ' + res.status);
const data = await res.json();
const out = {};
for (const [id, f] of Object.entries(FLEUVES)) {
  const lignes = [];
  for (const ft of data.features) {
    if (!f.ne.includes(ft.properties.name)) continue;
    const g = ft.geometry;
    for (const ligne of g.type === 'LineString' ? [g.coordinates] : g.coordinates) {
      // une ligne qui traverse l'antiméridien serait coupée en deux (aucun de ces fleuves n'en a besoin)
      if (ligne.some((p, i) => i && Math.abs(p[0] - ligne[i - 1][0]) > 180)) throw new Error('antiméridien : ' + id);
      const s = dp(ligne.map(([lo, la]) => [lo, la]), TOL);
      if (s.length >= 2) lignes.push(s.map(([lo, la]) => [Math.round(lo * 10) / 10, Math.round(la * 10) / 10]));
    }
  }
  if (!lignes.length) throw new Error('fleuve introuvable : ' + id);
  out[id] = { nom: f.nom, continent: f.continent, lignes };
}
const src = '// Généré par tools/build-rivers.mjs depuis Natural Earth 1:50m rivers_lake_centerlines (domaine public). Ne pas éditer.\n'
  + 'export const RIVERS = ' + JSON.stringify(out) + ';\n';
writeFileSync(OUT, src);
console.log(OUT, (src.length / 1024).toFixed(1) + ' Ko');
