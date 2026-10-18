// Pots principal et secondaires (pur).
// players : [{ totalBet, folded, out? }] -> [{ amount, eligible: indices }]
export function buildPots(players) {
  const inHand = (p) => !p.folded && !p.out;
  const levels = [...new Set(players.filter((p) => inHand(p) && p.totalBet > 0).map((p) => p.totalBet))].sort((a, b) => a - b);
  const pots = [];
  let prev = 0;
  for (const level of levels) {
    let amount = 0;
    for (const p of players) amount += Math.min(p.totalBet, level) - Math.min(p.totalBet, prev);
    const eligible = players.map((p, i) => (inHand(p) && p.totalBet >= level ? i : -1)).filter((i) => i >= 0);
    if (amount > 0) {
      const last = pots[pots.length - 1];
      if (last && last.eligible.length === eligible.length && last.eligible.every((v, k) => v === eligible[k])) last.amount += amount;
      else pots.push({ amount, eligible });
    }
    prev = level;
  }
  // mises des joueurs couchés au-delà du plus haut niveau (cas rare) : ajoutées au dernier pot
  const extra = players.reduce((s, p) => s + Math.max(0, p.totalBet - prev), 0);
  if (extra > 0 && pots.length) pots[pots.length - 1].amount += extra;
  return pots;
}

// Partage égal ; les jetons indivisibles vont aux premiers gagnants à gauche du donneur.
// -> [{ p, amount }]
export function splitPot(amount, winners, dealer, n) {
  const order = [...winners].sort((a, b) => ((a - dealer - 1 + n) % n) - ((b - dealer - 1 + n) % n));
  const base = Math.floor(amount / order.length);
  let rest = amount - base * order.length;
  return order.map((p) => ({ p, amount: base + (rest-- > 0 ? 1 : 0) }));
}
