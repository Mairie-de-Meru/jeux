// Placement des places autour de la table (pur, unités du monde 3D, axes x/z).
// Table paysage : demi-axes TA0 x TB0 ; portrait : axes échangés. Le feutre s'arrête au bord intérieur du bois.
export const TA0 = 5.6, TB0 = 3.4;
export const WOOD = 0.35; // marge : bord du bois + demi-jeton
export const LABEL_R = 0.84; // étiquette de place : fraction du rayon de l'ellipse
export const BOARD = { hx: 2.16, hz: 0.54 }; // demi-dimensions du rectangle des cartes communes
export const POT = { x: 0, z: -1.15 };
const CARD_W = 0.9, CARD_H = 1.35, GAP = 0.08;

export const cardScale = (n) => (n <= 3 ? 0.8 : n === 4 ? 0.7 : n === 5 ? 0.62 : 0.55);

const rect = (x, z, hx, hz) => ({ x, z, hx, hz });
export const overlap = (p, q, m = 0) => Math.abs(p.x - q.x) < p.hx + q.hx + m && Math.abs(p.z - q.z) < p.hz + q.hz + m;
export function inEllipse(r, a, b, margin = WOOD) {
  const A = a - margin, B = b - margin;
  return [[-1, -1], [-1, 1], [1, -1], [1, 1]].every(([sx, sz]) => ((r.x + sx * r.hx) / A) ** 2 + ((r.z + sz * r.hz) / B) ** 2 <= 1);
}
export const cardRect = (x, z, s) => rect(x, z, CARD_W * s + GAP / 2, (CARD_H * s) / 2); // les 2 cartes côte à côte

// -> { a, b, seats: [{ pos, cards:{x,z,s,rect}, bet, dealer }] }  (seats[slot], slot 0 = en bas)
export function seatLayout(n, portrait = false) {
  const a = portrait ? TB0 : TA0, b = portrait ? TA0 : TB0;
  const boardR = rect(0, 0, BOARD.hx, BOARD.hz);
  const potR = rect(POT.x, POT.z, 0.5, 0.5);
  const taken = [];
  const seats = [];
  for (let slot = 0; slot < n; slot++) {
    const th = Math.PI / 2 + (2 * Math.PI * slot) / n;
    const ux = Math.cos(th) * a, uz = Math.sin(th) * b;
    const pos = { x: ux * LABEL_R, z: uz * LABEL_R };
    // cartes : le long du rayon vers le centre, sur le feutre, hors zone du tableau et des voisines
    let s = cardScale(n), cards = null;
    const tl0 = Math.hypot(Math.sin(th) * a, Math.cos(th) * b) || 1;
    const tdx = -(Math.sin(th) * a) / tl0, tdz = (Math.cos(th) * b) / tl0;
    for (let tries = 0; tries < 14 && !cards; tries++, s *= 0.92) {
      for (const sh of [0, 0.5, -0.5, 1, -1, 1.5, -1.5]) for (let r = 0.62; r >= 0.3 && !cards; r -= 0.02) {
        const cx = ux * r + tdx * sh, cz = uz * r + tdz * sh;
        const rc = cardRect(cx, cz, s);
        if (inEllipse(rc, a, b) && !overlap(rc, boardR, 0.08) && !taken.some((t) => overlap(rc, t, 0.06))) cards = { x: cx, z: cz, s, rect: rc };
      }
    }
    taken.push(cards.rect);
    seats.push({ pos, cards, bet: null, dealer: null });
  }
  // piles de mise puis bouton donneur : sur le feutre, sans toucher cartes, tableau, pot ni autres piles
  const obst = [boardR, potR, ...taken];
  const free = (q) => inEllipse(q, a, b) && !obst.some((o) => overlap(q, o, 0.04));
  seats.forEach((st, slot) => {
    const th = Math.PI / 2 + (2 * Math.PI * slot) / n;
    const ux = Math.cos(th) * a, uz = Math.sin(th) * b;
    const tx = -Math.sin(th) * a, tz = Math.cos(th) * b;
    const tl = Math.hypot(tx, tz) || 1;
    const find = (half, rs, shifts) => {
      for (const r of rs) for (const sh of shifts) {
        const q = rect(ux * r + (tx / tl) * sh, uz * r + (tz / tl) * sh, half, half);
        if (free(q)) return q;
      }
      return null;
    };
    const rs = [0.5, 0.46, 0.42, 0.38, 0.34, 0.3, 0.55, 0.6];
    const bq = find(0.45, rs, [0, 0.9, -0.9, 1.4, -1.4]) || find(0.3, rs, [0, 0.9, -0.9, 1.4, -1.4, 2, -2]);
    st.bet = bq ? { x: bq.x, z: bq.z } : { x: ux * 0.4, z: uz * 0.4 };
    if (bq) obst.push(bq);
    const c = st.cards;
    const dq = find(0.32, [0.62, 0.58, 0.54, 0.5, 0.46, 0.7], [c.rect.hx + 0.5, -(c.rect.hx + 0.5), c.rect.hx + 1.0, -(c.rect.hx + 1.0)]);
    st.dealer = dq ? { x: dq.x, z: dq.z } : { x: c.x, z: c.z };
  });
  return { a, b, seats };
}
