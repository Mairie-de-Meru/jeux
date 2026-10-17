// Images optionnelles listées dans assets/manifest.json : chargées à la demande, erreurs ignorées (repli en dessin).
import { setRef } from './textures.mjs';
let manifest = null;
const cache = {};
const loaded = {};
function loadManifest() {
  return (manifest ||= fetch('./assets/manifest.json').then((r) => (r.ok ? r.json() : null)).then((m) => (m && m.images) || {}).catch(() => ({})));
}
export function getImage(key) {
  return (cache[key] ||= loadManifest().then((imgs) => new Promise((res) => {
    const rel = imgs[key]; if (!rel) return res(null);
    const img = new Image(); img.onload = () => { loaded[key] = img; res(img); }; img.onerror = () => res(null); img.src = './assets/' + rel;
  })));
}
// première image disponible parmi plusieurs clés (ex. dos « ref » puis ancien dos)
export async function getFirst(keys) { for (const k of keys) { const i = await getImage(k); if (i) return i; } return null; }
// image déjà chargée (synchrone) ou null
export const peek = (key) => loaded[key] || null;
// images de référence (billets, icônes, pions…) : disponibles pour les dessins canvas dès leur arrivée
export const refsReady = loadManifest().then((imgs) => Promise.all(Object.keys(imgs).filter((k) => /^(icone-|billet-|pion-|dos-.*-ref|des$|maisons$|hotels$)/.test(k)).map((k) => getImage(k).then((i) => { if (i) setRef(k, i); })))).then(() => true);
export const GROUP_IMG = { brown: 'marron', lightblue: 'bleu-clair', pink: 'rose', orange: 'orange', red: 'rouge', yellow: 'jaune', green: 'vert', darkblue: 'bleu-fonce' };
export const PAWN_IMG = { car: 'pion-voiture', dog: 'pion-chien', cat: 'pion-chat', boat: 'pion-bateau', plane: 'pion-avion' };
// avatar d'un pion : image de référence si présente, sinon emoji
export function pawnAvatar(id, emoji, size = 26) {
  const img = peek(PAWN_IMG[id]);
  if (!img) return document.createTextNode(emoji);
  const i = img.cloneNode(); i.alt = ''; i.style.cssText = `height:${size}px;width:auto;vertical-align:middle`; return i;
}
