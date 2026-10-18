// Images optionnelles listées dans assets/manifest.json : chargées à la demande, erreurs ignorées (repli en dessin).
import { setRef } from './textures.mjs';
import { pawnAvatarURL, peekAvatarURL } from './avatars.mjs';
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
export const refsReady = loadManifest().then((imgs) => Promise.all(Object.keys(imgs).filter((k) => /^(icone-|billet-|dos-.*-ref|des$|maisons$|hotels$)/.test(k)).map((k) => getImage(k).then((i) => { if (i) setRef(k, i); })))).then(() => true);
export const GROUP_IMG = { brown: 'marron', lightblue: 'bleu-clair', pink: 'rose', orange: 'orange', red: 'rouge', yellow: 'jaune', green: 'vert', darkblue: 'bleu-fonce' };
// avatar d'un pion : rendu 3D du pion du jeu à la couleur du joueur ; emoji tant que le rendu n'est pas prêt (ou sans WebGL)
function avatarImg(url, size) {
  const i = document.createElement('img'); i.src = url; i.alt = ''; i.draggable = false;
  i.style.cssText = `height:${size}px;width:${size}px;vertical-align:middle`; return i;
}
export function pawnAvatar(id, emoji, size = 26, color = '#e5424f') {
  const hit = peekAvatarURL(id, color);
  if (hit) return avatarImg(hit, size);
  const span = document.createElement('span'); span.className = 'avatar'; span.textContent = emoji;
  pawnAvatarURL(id, color).then((url) => { if (url) span.replaceChildren(avatarImg(url, size)); });
  return span;
}
// avatar d'un joueur de la partie (pion + couleur du joueur)
export const playerAvatar = (p, size = 22) => pawnAvatar(p.pawn, p.emoji, size, p.color);
