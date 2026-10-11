// Géographie pure : conversions sphère / UV, appartenance aux continents et océans.
import { CONTINENTS } from '../data/continents.js';

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

// y = nord, lon 0 face à +z, lon +90 vers +x.
export function latLonToVec3(lat, lon, r = 1) {
  const la = lat * D2R, lo = lon * D2R;
  return { x: r * Math.cos(la) * Math.sin(lo), y: r * Math.sin(la), z: r * Math.cos(la) * Math.cos(lo) };
}

export function vec3ToLatLon({ x, y, z }) {
  const r = Math.sqrt(x * x + y * y + z * z) || 1;
  const lat = Math.asin(Math.max(-1, Math.min(1, y / r))) * R2D;
  let lon = Math.atan2(x, z) * R2D;
  if (lon <= -180) lon += 360;
  return { lat, lon };
}

export function latLonToUV(lat, lon) {
  return { u: (lon + 180) / 360, v: (lat + 90) / 180 };
}

export function uvToLatLon(u, v) {
  return { lat: v * 180 - 90, lon: u * 360 - 180 };
}

export function normLon(lon) {
  let l = ((lon + 180) % 360 + 360) % 360 - 180;
  if (l === -180) l = 180;
  return l;
}

// ring : [[lon, lat], ...]
export function pointInPolygon(lat, lon, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function polygonContinent(lat, lon) {
  for (const id of Object.keys(CONTINENTS)) {
    for (const ring of CONTINENTS[id]) if (pointInPolygon(lat, lon, ring)) return id;
  }
  return null;
}

export function continentAt(lat, lon) {
  const l = normLon(lon);
  const c = polygonContinent(lat, l);
  if (c) return c;
  return lat < -62 ? 'antarctique' : null;
}

export function oceanAt(lat, lon) {
  const l = normLon(lon);
  if (polygonContinent(lat, l)) return null;
  if (lat > 66) return 'arctique';
  if (lat < -55) return 'austral';
  // Caraïbes et golfe du Mexique, baie d'Hudson
  if (l >= -100 && l <= -70 && lat >= 8 && lat <= 31) return 'atlantique';
  if (l >= -100 && l <= -60 && lat >= 50) return 'atlantique';
  if (l >= -70 && l <= 20) return 'atlantique';
  // mers fermées d'Europe (Méditerranée, mer Noire, Caspienne)
  if (l > 20 && l < 60 && lat >= 30 && lat <= 50) return 'atlantique';
  if (l > 20 && l <= 120 && lat < 25) return 'indien';
  if (l > 20 && l <= 147 && lat <= -8) return 'indien';
  if (l > 20 && l <= 60 && lat < 30) return 'indien';
  return 'pacifique';
}

export function angularDistance(a, b) {
  const p = latLonToVec3(a.lat, a.lon), q = latLonToVec3(b.lat, b.lon);
  const d = p.x * q.x + p.y * q.y + p.z * q.z;
  return Math.acos(Math.max(-1, Math.min(1, d))) * R2D;
}

// Distance (degrés) d'un point à une polyligne [[lon, lat], ...] : plus proche point des arcs de grand cercle.
export function distancePolyligne(pt, ligne) {
  const p = latLonToVec3(pt.lat, pt.lon);
  let best = Infinity;
  const pts = ligne.map(([lo, la]) => latLonToVec3(la, lo));
  const cross = (a, b) => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
  const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
  const ang = (a, b) => Math.acos(Math.max(-1, Math.min(1, dot(a, b)))) * R2D;
  for (let i = 0; i < pts.length; i++) {
    best = Math.min(best, ang(p, pts[i]));
    if (i === 0) continue;
    const a = pts[i - 1], b = pts[i];
    const n = cross(a, b), nl = Math.sqrt(dot(n, n));
    if (nl < 1e-9) continue;
    const nn = { x: n.x / nl, y: n.y / nl, z: n.z / nl };
    const d = dot(p, nn);
    const q = { x: p.x - d * nn.x, y: p.y - d * nn.y, z: p.z - d * nn.z }; // projection sur le plan de l'arc
    const ql = Math.sqrt(dot(q, q));
    if (ql < 1e-9) continue;
    const u = { x: q.x / ql, y: q.y / ql, z: q.z / ql };
    // u est sur l'arc [a, b] si les angles a-u et u-b s'additionnent à a-b
    if (Math.abs(ang(a, u) + ang(u, b) - ang(a, b)) < 1e-6) best = Math.min(best, ang(p, u));
  }
  return best;
}
