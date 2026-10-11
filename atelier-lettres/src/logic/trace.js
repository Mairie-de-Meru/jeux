// Comparaison de tracés et sessions de tracé. Module pur.

const DEFAULTS = { tolerance: 0.12, startRadius: 0.2, minCoverage: 0.75, checkDirection: true, strictOrder: true };
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export function pathLength(pts) {
  let l = 0;
  for (let i = 1; i < pts.length; i++) l += dist(pts[i - 1], pts[i]);
  return l;
}

// Pas régulier en abscisse curviligne, n points (extrémités incluses).
export function resample(pts, n) {
  if (!pts.length) return [];
  const total = pathLength(pts);
  if (pts.length === 1 || total < 1e-12) return Array.from({ length: n }, () => ({ x: pts[0].x, y: pts[0].y }));
  const out = [{ x: pts[0].x, y: pts[0].y }];
  let seg = 1;
  let acc = 0; // longueur cumulée au début du segment courant
  let segLen = dist(pts[0], pts[1]);
  for (let k = 1; k < n - 1; k++) {
    const target = (total * k) / (n - 1);
    while (seg < pts.length - 1 && acc + segLen < target) {
      acc += segLen;
      seg++;
      segLen = dist(pts[seg - 1], pts[seg]);
    }
    const t = segLen > 0 ? Math.min(1, (target - acc) / segLen) : 0;
    const a = pts[seg - 1];
    const b = pts[seg];
    out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  }
  const last = pts[pts.length - 1];
  out.push({ x: last.x, y: last.y });
  return out;
}

function distToSegment(p, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  let t = l2 > 0 ? ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t));
}

export function distToPolyline(p, pts) {
  if (!pts.length) return Infinity;
  if (pts.length === 1) return dist(p, pts[0]);
  let d = Infinity;
  for (let i = 1; i < pts.length; i++) d = Math.min(d, distToSegment(p, pts[i - 1], pts[i]));
  return d;
}

// Priorité : short, puis sens/départ (sens inversé reconnu avant « départ loin »), off, coverage.
export function compareStroke(user, template, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const res = (hint, coverage = 0, deviation = Infinity, startDist = Infinity) => ({ ok: hint === null, hint, coverage, deviation, startDist });
  if (!user || !user.length) return res('short');
  const u = user.length === 1 ? [user[0], user[0]] : user;
  const tStart = template[0];
  const tEnd = template[template.length - 1];
  const startDist = dist(u[0], tStart);

  const tLen = pathLength(template);
  if (tLen < 0.03) {
    // trait « point » (i, j) : seul le départ compte
    return startDist <= o.startRadius ? res(null, 1, 0, startDist) : res('start', 0, Infinity, startDist);
  }
  if (pathLength(u) < 0.4 * tLen) return res('short', 0, Infinity, startDist);

  if (pathLength(u) > 3 * tLen) return res('off', 0, Infinity, startDist); // gribouillis : tracé 3 fois trop long

  const ur = resample(u, 32);
  const tr = resample(template, 32);

  if (o.checkDirection) {
    const closed = dist(tStart, tEnd) < 0.1; // boucle fermée : on compare le quart du tracé
    const reversed = closed ? dist(ur[8], tr[24]) < dist(ur[8], tr[8]) : dist(u[0], tEnd) < startDist;
    if (reversed) return res('direction', 0, Infinity, startDist);
    if (startDist > o.startRadius) return res('start', 0, Infinity, startDist);
  }

  let dev = 0;
  for (const p of ur) dev += distToPolyline(p, template);
  dev /= ur.length;
  let cov = 0;
  for (const p of tr) if (distToPolyline(p, u) <= 1.5 * o.tolerance) cov++;
  cov /= tr.length;
  if (dev > o.tolerance) return res('off', cov, dev, startDist);
  if (cov < o.minCoverage) return res('coverage', cov, dev, startDist);
  return res(null, cov, dev, startDist);
}

export function createTraceSession(glyph, opts = {}) {
  return { glyph, opts: { ...DEFAULTS, ...opts }, done: glyph.strokes.map(() => false), hints: 0 };
}

export function nextStroke(session) {
  return session.done.indexOf(false);
}

export function submitStroke(session, userPts) {
  const next = nextStroke(session);
  if (next === -1) return { accepted: false, strokeIndex: -1, hint: null, complete: true };
  const { glyph, opts } = session;
  let best = null;
  let idx = next;
  if (opts.strictOrder) {
    best = compareStroke(userPts, glyph.strokes[next], opts);
  } else {
    let refused = null;
    let refusedIdx = next;
    glyph.strokes.forEach((s, i) => {
      if (session.done[i]) return;
      const r = compareStroke(userPts, s, opts);
      if (r.ok) {
        if (!best || r.deviation < best.deviation) {
          best = r;
          idx = i;
        }
      } else if (!refused || r.startDist < refused.startDist) {
        refused = r;
        refusedIdx = i;
      }
    });
    if (!best) {
      best = refused;
      idx = refusedIdx;
    }
  }
  if (best.ok) {
    session.done[idx] = true;
    return { accepted: true, strokeIndex: idx, hint: null, complete: session.done.every(Boolean) };
  }
  session.hints++;
  return { accepted: false, strokeIndex: idx, hint: best.hint, complete: false };
}
