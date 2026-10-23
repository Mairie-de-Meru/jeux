// Fiche de propriété (titre de propriété) en DOM.
import { h } from './dom.mjs';
import { SPACES, GROUP_INFO, GROUPS, unmortgageCost } from '../logic/board.mjs';
import { getFirst, GROUP_IMG } from '../render/images.mjs';
import { iconCanvas } from '../render/textures.mjs';

const money = (n) => `${n} €`;

// Illustration d'une case achetable : image propre à la case (case-<index>), sinon celle du quartier (rues),
// sinon `fallback` (icône pour gares et compagnies, rien pour une rue : le bandeau de couleur suffit).
export function deedImage(i, fallback = null) {
  const sp = SPACES[i]; const box = h('div', { class: 'qimg' }); if (fallback) box.append(fallback);
  const keys = ['case-' + i]; if (sp.kind === 'prop') keys.push('quartier-' + GROUP_IMG[sp.group]);
  getFirst(keys).then((img) => { if (img) { const im = img.cloneNode(); im.alt = ''; im.style.cssText = 'width:100%;max-height:16dvh;object-fit:cover;border-radius:8px 8px 0 0;display:block'; box.replaceChildren(im); } });
  return box;
}

export function deedNode(state, i) {
  const sp = SPACES[i]; const o = state.owners[i];
  const ownerTxt = o ? `Propriétaire : ${state.players[o.owner].emoji} ${state.players[o.owner].name}${o.mortgaged ? ' (en gage)' : ''}` : (sp.price ? 'Libre : à la banque' : '');
  if (sp.kind === 'prop') {
    const col = GROUP_INFO[sp.group].color; const hs = o ? o.houses : -1;
    const labels = ['Terrain nu', '1 maison', '2 maisons', '3 maisons', '4 maisons', 'Hôtel'];
    const owns = o && GROUPS[sp.group].every((j) => state.owners[j] && state.owners[j].owner === o.owner);
    const qimg = deedImage(i);
    return h('div', {},
      h('div', { class: 'deed' },
        qimg,
        h('div', { class: 'band', style: `background:${col}` }, sp.name),
        h('table', {}, ...sp.rents.map((r, k) => h('tr', { class: hs === k ? 'hl' : '' }, h('td', {}, labels[k] + (k === 0 && owns && hs === 0 ? ' (groupe complet ×2)' : '')), h('td', {}, money(k === 0 && owns && hs === 0 ? r * 2 : r))))),
        h('div', { class: 'foot' }, `Prix : ${money(sp.price)} · Maison ou hôtel : ${money(sp.house)} chacun`),
        h('div', { class: 'foot' }, `Gage : ${money(sp.mortgage)} · Reprendre : ${money(unmortgageCost(i))}`)),
      h('p', {}, ownerTxt));
  }
  if (sp.kind === 'station') {
    return h('div', {}, h('div', { class: 'deed' }, deedImage(i, h('div', { style: 'text-align:center' }, iconCanvas('station', 64))), h('div', { class: 'band', style: 'background:#3b4a66' }, sp.name),
      h('table', {}, ...[25, 50, 100, 200].map((r, k) => h('tr', {}, h('td', {}, `${k + 1} gare${k ? 's' : ''}`), h('td', {}, money(r))))),
      h('div', { class: 'foot' }, `Prix : ${money(200)} · Gage : ${money(100)}`)), h('p', {}, ownerTxt));
  }
  if (sp.kind === 'utility') {
    return h('div', {}, h('div', { class: 'deed' }, deedImage(i, h('div', { style: 'text-align:center' }, iconCanvas(i === 12 ? 'tower' : 'bulb', 64))), h('div', { class: 'band', style: 'background:#3b4a66' }, sp.name),
      h('table', {}, h('tr', {}, h('td', {}, '1 compagnie'), h('td', {}, '4 × les dés')), h('tr', {}, h('td', {}, '2 compagnies'), h('td', {}, '10 × les dés'))),
      h('div', { class: 'foot' }, `Prix : ${money(150)} · Gage : ${money(75)}`)), h('p', {}, ownerTxt));
  }
  const text = { go: 'Chaque fois que tu passes par le Départ, tu reçois 200 €.', jail: 'Simple visite, ou prison : pour sortir, paie 50 €, utilise une carte Évasion ou fais un double.', freepark: 'Une pause : il ne se passe rien ici.', gotojail: 'Direction la prison !', tax: `Paie ${sp.amount} € à la banque.`, surprise: 'Pioche une carte Chance.', tirelire: 'Pioche une carte Caisse de communauté.' }[sp.kind];
  return h('div', {}, h('div', { class: 'deed' }, h('div', { class: 'band', style: 'background:#3b4a66' }, sp.name), h('div', { class: 'foot' }, text)));
}
