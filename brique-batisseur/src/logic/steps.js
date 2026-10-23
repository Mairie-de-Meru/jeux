// Mode « pas à pas » : la brique suivante à poser, vérification d'une pose, libellés. Module pur.
import { PIECES, colorById } from './pieces.js';
import { SIZE, toVoxels } from './board.js';
import { transformPieces, centerTransform } from './challenges.js';

/** Pièces cibles placées sur la plaque (modèle centré par défaut), dans l'ordre de construction. */
export function stepTargets(pieces, transform = centerTransform(pieces, SIZE)) {
  return transformPieces(pieces, transform);
}

const voxelKey = (p) => [...toVoxels([p]).keys()].sort().join(';');

/** Même couleur et mêmes cases occupées (une 1x2 rot 0 ≡ rot 2) ; pour un toit, la rotation compte. */
export function matchesTarget(target, piece) {
  if (!piece || target.color !== piece.color) return false;
  if (PIECES[target.type].kind === 'roof' || PIECES[piece.type].kind === 'roof') {
    return target.type === piece.type && target.rot === piece.rot && target.x === piece.x && target.z === piece.z && target.y === piece.y;
  }
  return voxelKey(target) === voxelKey(piece);
}

const satisfied = (target, pieces) => pieces.some((p) => matchesTarget(target, p));

/** Indice de la première cible non satisfaite, ou targets.length si le modèle est fini. */
export function nextStepIndex(targets, boardPieces) {
  const i = targets.findIndex((t) => !satisfied(t, boardPieces));
  return i < 0 ? targets.length : i;
}

/**
 * La pièce qui vient d'être posée (déjà dans boardPieces ou non) satisfait-elle la cible attendue ?
 * → { ok: true, index } ou { ok: false, index, reason: 'color' | 'size' | 'place' }
 */
export function checkPlacement(targets, boardPieces, newPiece) {
  const before = boardPieces.filter((p) => p !== newPiece && (newPiece.uid == null || p.uid !== newPiece.uid));
  const index = nextStepIndex(targets, before);
  const t = targets[index];
  if (!t) return { ok: false, index, reason: 'place' };
  if (matchesTarget(t, newPiece)) return { ok: true, index };
  if (t.color !== newPiece.color) return { ok: false, index, reason: 'color' };
  if (t.type !== newPiece.type) return { ok: false, index, reason: 'size' };
  return { ok: false, index, reason: 'place' };
}

const FEMININE = { vert: 'verte', bleu: 'bleue', violet: 'violette', blanc: 'blanche' };

/** Nom court de la couleur, accordé au genre du nom (« brique verte », « toit vert »). */
export function colorWord(colorId, feminine) {
  const base = (colorById(colorId)?.label ?? colorId).toLowerCase();
  return feminine ? FEMININE[base] ?? base : base;
}

/** « Brique 2×2 rouge », « Toit 2×2 rouge », « Tuile 1×2 bleue ». */
export function stepLabel(target) {
  const p = PIECES[target.type];
  if (p.kind === 'roof') return `${p.label} ${colorWord(target.color, false)}`;
  if (p.kind === 'tile') return `${p.label} ${colorWord(target.color, true)}`;
  return `Brique ${p.label} ${colorWord(target.color, true)}`;
}

/** Indice doux selon la raison d'une pose incorrecte. */
export function stepHint(reason, target) {
  if (reason === 'color' && target) return `Prends la ${PIECES[target.type].kind === 'roof' ? 'couleur' : 'brique'} ${colorWord(target.color, true)} !`;
  if (reason === 'size') return 'Regarde la taille !';
  return 'Pose-la sur la brique qui brille !';
}
