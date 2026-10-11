// Petit personnage en SVG inline (même dessin que le pion 3D).
export const BOT_COLOR = '#b0bec5';

export function avatarSVG(couleur, { bot = false, size = 40 } = {}) {
  const c = couleur || (bot ? BOT_COLOR : '#ff6bb5');
  const ant = bot
    ? '<line x1="32" y1="6" x2="32" y2="14" stroke="#78909c" stroke-width="2.5" stroke-linecap="round"/><circle cx="32" cy="5" r="4" fill="#ff3b3b"/>'
    : '';
  return `<svg class="avsvg" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true">${ant}`
    + `<rect x="7" y="30" width="9" height="20" rx="4.5" fill="${c}" transform="rotate(12 11 32)"/>`
    + `<rect x="48" y="30" width="9" height="20" rx="4.5" fill="${c}" transform="rotate(-12 53 32)"/>`
    + `<rect x="16" y="12" width="32" height="46" rx="16" fill="${c}"/>`
    + '<circle cx="26" cy="29" r="5.5" fill="#fff"/><circle cx="38" cy="29" r="5.5" fill="#fff"/>'
    + '<circle cx="26.5" cy="30" r="2.6" fill="#222"/><circle cx="37.5" cy="30" r="2.6" fill="#222"/></svg>';
}
