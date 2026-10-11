// Monnaie en euros, tout en centimes entiers. Module pur.
const mk = (value, kind, label) => ({ value, kind, label });

export const DENOMINATIONS = [
  mk(1, 'coin', '1c'),
  mk(2, 'coin', '2c'),
  mk(5, 'coin', '5c'),
  mk(10, 'coin', '10c'),
  mk(20, 'coin', '20c'),
  mk(50, 'coin', '50c'),
  mk(100, 'coin', '1 €'),
  mk(200, 'coin', '2 €'),
  mk(500, 'bill', '5 €'),
  mk(1000, 'bill', '10 €'),
];

export const ALL_VALUES = DENOMINATIONS.map((d) => d.value);

export function denomination(value) {
  return DENOMINATIONS.find((d) => d.value === value) || null;
}

export function sum(values) {
  let s = 0;
  for (const v of values) s += v;
  return s;
}

export function formatEuros(cents) {
  const euros = Math.floor(cents / 100);
  const rest = cents % 100;
  if (rest === 0) return `${euros} €`;
  return `${euros},${String(rest).padStart(2, '0')} €`;
}

export function spokenEuros(cents) {
  const euros = Math.floor(cents / 100);
  const rest = cents % 100;
  if (euros === 0 && rest === 0) return '0 euro';
  if (euros === 0) return `${rest} centime${rest > 1 ? 's' : ''}`;
  const e = `${euros} euro${euros > 1 ? 's' : ''}`;
  return rest === 0 ? e : `${e} ${rest}`;
}

// Plus petit nombre de pièces (valeurs triées par ordre décroissant),
// ou null si le montant n'est pas atteignable.
export function minPieces(amount, allowed = ALL_VALUES) {
  if (!Number.isInteger(amount) || amount < 0) return null;
  const vals = [...new Set(allowed)].sort((a, b) => b - a);
  // Glouton (optimal pour le système euro et ses sous-ensembles usuels).
  let left = amount;
  const out = [];
  for (const v of vals) {
    while (left >= v) {
      out.push(v);
      left -= v;
    }
  }
  if (left === 0) return out;
  // Repli : programmation dynamique pour les jeux de valeurs non canoniques.
  const INF = Infinity;
  const dp = new Array(amount + 1).fill(INF);
  const from = new Array(amount + 1).fill(0);
  dp[0] = 0;
  for (let a = 1; a <= amount; a++) {
    for (const v of vals) {
      if (v <= a && dp[a - v] + 1 < dp[a]) {
        dp[a] = dp[a - v] + 1;
        from[a] = v;
      }
    }
  }
  if (dp[amount] === INF) return null;
  const res = [];
  for (let a = amount; a > 0; a -= from[a]) res.push(from[a]);
  return res.sort((a, b) => b - a);
}

export function minPieceCount(amount, allowed = ALL_VALUES) {
  const p = minPieces(amount, allowed);
  return p === null ? null : p.length;
}

export function isExactlyReachable(amount, allowed = ALL_VALUES) {
  return minPieces(amount, allowed) !== null;
}
