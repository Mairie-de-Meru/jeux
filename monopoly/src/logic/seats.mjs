// Attribution pure des pions et clés de cache des avatars rendus.
export const avatarKey = (type, color) => `${type}|${String(color).toLowerCase()}`;
// Pion de chaque place : la place 0 a le pion choisi, les autres reçoivent les pions restants, tous différents.
export function assignPawns(mine, pawnIds, seatCount) {
  const first = pawnIds.includes(mine) ? mine : pawnIds[0];
  const rest = pawnIds.filter((p) => p !== first);
  return Array.from({ length: seatCount }, (_, k) => (k === 0 ? first : rest[(k - 1) % rest.length]));
}
