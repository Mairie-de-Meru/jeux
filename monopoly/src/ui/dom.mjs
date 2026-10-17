// Petits outils DOM : constructeur d'éléments et pile de fenêtres.
export function h(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'style') e.style.cssText = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'html') e.innerHTML = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(String(c)));
  return e;
}
export const $ = (sel) => document.querySelector(sel);

const layers = new Map();
export function showModal(id, content, { onClose } = {}) {
  hideModal(id, true);
  const sheet = h('div', { class: 'sheet' }, content);
  const layer = h('div', { class: 'layer', 'data-id': id }, sheet);
  layers.set(id, { layer, onClose });
  $('#modal').append(layer);
  return sheet;
}
export function hideModal(id, silent) {
  const l = layers.get(id); if (!l) return;
  l.layer.remove(); layers.delete(id);
  if (!silent && l.onClose) l.onClose();
}
export const hasModal = (id) => layers.has(id);
export const anyModal = () => layers.size > 0;
export function hideAllModals() { for (const id of [...layers.keys()]) hideModal(id, true); }
