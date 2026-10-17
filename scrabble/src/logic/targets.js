// Cases où l'enfant peut poser une lettre (aide visuelle). Fonction pure.
// grid : tableau de lignes (case occupée = valeur vraie) ; pending : [{r, c}] lettres en cours ;
// center : indice de la case centrale ; firstMove : aucun mot posé sur le plateau.
// Renvoie une liste de [r, c] ; la règle de jeu valide le coup au moment de « Valider ».
export function playableCells(grid, pending, center, firstMove) {
  const n = grid.length;
  const inb = (r, c) => r >= 0 && c >= 0 && r < n && c < n;
  const pend = new Set(pending.map((p) => p.r * n + p.c));
  const free = (r, c) => inb(r, c) && !grid[r][c] && !pend.has(r * n + c);
  const filled = (r, c) => inb(r, c) && (grid[r][c] || pend.has(r * n + c));
  const out = [];
  const seen = new Set();
  const add = (r, c) => { if (free(r, c) && !seen.has(r * n + c)) { seen.add(r * n + c); out.push([r, c]); } };

  if (pending.length === 0) {
    if (firstMove) {
      add(center, center);
      for (let k = 0; k < n; k++) { add(center, k); add(k, center); }
      return out;
    }
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      if (grid[r][c]) { add(r - 1, c); add(r + 1, c); add(r, c - 1); add(r, c + 1); }
    }
    return out;
  }

  // prolongement d'une ligne (dr,dc) passant par les lettres en cours : trous + première case libre de chaque bout
  const line = (dr, dc) => {
    const p0 = pending[0];
    const t = (p) => (dr ? p.r : p.c);
    const lo = Math.min(...pending.map(t)), hi = Math.max(...pending.map(t));
    const at = (k) => (dr ? [k, p0.c] : [p0.r, k]);
    for (let k = lo + 1; k < hi; k++) add(...at(k));
    for (let k = lo - 1; k >= 0; k--) { const [r, c] = at(k); if (filled(r, c)) continue; add(r, c); break; }
    for (let k = hi + 1; k < n; k++) { const [r, c] = at(k); if (filled(r, c)) continue; add(r, c); break; }
  };
  const sameRow = pending.every((p) => p.r === pending[0].r);
  const sameCol = pending.every((p) => p.c === pending[0].c);
  if (sameRow) line(0, 1);
  if (sameCol) line(1, 0);
  return out;
}
