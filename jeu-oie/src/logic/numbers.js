// Nombres en toutes lettres (0..99) pour compter à voix haute.
const UNITS = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix',
  'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
const TENS = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante'];

export function numberToFrench(n) {
  n = Math.floor(n);
  if (n < 0 || n > 99) return String(n);
  if (n < 20) return UNITS[n];
  if (n >= 80) {
    if (n === 80) return 'quatre-vingts';
    return 'quatre-vingt-' + UNITS[n - 80];
  }
  if (n >= 70) {
    const r = n - 60;
    return n === 71 ? 'soixante et onze' : 'soixante-' + UNITS[r];
  }
  const t = Math.floor(n / 10), u = n % 10;
  if (u === 0) return TENS[t];
  if (u === 1) return TENS[t] + ' et un';
  return TENS[t] + '-' + UNITS[u];
}
