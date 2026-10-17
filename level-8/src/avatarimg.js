// Images d'avatars préchargées ; repli sur l'emoji tant qu'une image manque (pas de 404 : manifeste interne).
import { AVATARS, AVATAR_FILES } from './logic/avatars.js';

const loaded = new Map();
const listeners = [];
export function preloadAvatars() {
  for (const a of AVATARS) {
    if (!AVATAR_FILES.includes(a.file)) continue;
    const im = new Image();
    im.onload = () => { loaded.set(a.id, im); listeners.forEach((f) => f(a.id)); };
    im.onerror = () => {};
    im.src = `./assets/img/${a.file}`;
  }
}
export const avatarImage = (id) => loaded.get(id) || null;
export const onAvatarLoaded = (f) => listeners.push(f);

// HTML d'un avatar rond (image si chargée, sinon emoji)
export function avatarHTML(p, cls = '') {
  const im = p.avatar && loaded.get(p.avatar);
  return im
    ? `<span class="av ${cls}"><img src="${im.src}" alt=""></span>`
    : `<span class="av emo ${cls}">${p.emoji}</span>`;
}
