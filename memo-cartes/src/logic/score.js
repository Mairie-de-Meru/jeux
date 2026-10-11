export function stars(tries, pairs) {
  if (tries <= pairs * 1.5) return 3;
  if (tries <= pairs * 2.5) return 2;
  return 1;
}
