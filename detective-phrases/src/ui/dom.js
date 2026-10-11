// Petits utilitaires DOM.
export const $ = (id) => document.getElementById(id);

export function el(tag, props = {}, ...enfants) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') n.className = v;
    else if (k === 'texte') n.textContent = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (v !== undefined && v !== null) n.setAttribute(k, v);
  }
  for (const e of enfants.flat()) if (e) n.append(e);
  return n;
}

export function montrer(idEcran) {
  document.querySelectorAll('.ecran').forEach((e) => e.classList.toggle('cache', e.id !== idEcran));
}

export const etoilesTexte = (n) => '⭐'.repeat(n) + '☆'.repeat(Math.max(0, 3 - n));
