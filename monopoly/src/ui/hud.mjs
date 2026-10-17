// Joueurs et argent : billets colorés dessinés en canvas.
import { h } from './dom.mjs';
import { pawnAvatar } from '../render/images.mjs';
import { moneyCanvas } from '../render/textures.mjs';
import { netWorth, ownedBy } from '../logic/rules.mjs';

export function renderPlayers(container, state, me, onPick) {
  container.replaceChildren(...state.players.map((p) => {
    const cls = 'pchip' + (p.id === state.current && !state.over ? ' cur' : '') + (p.bankrupt ? ' out' : '') + (p.id === me ? ' me' : '');
    const notes = moneyCanvas(p.money);
    return h('button', { class: cls, style: `border-color:${p.color}`, onclick: () => onPick(p.id), 'aria-label': p.name },
      h('span', { class: 'nm' }, pawnAvatar(p.pawn, p.emoji, 22), ` ${p.name}`),
      h('span', { class: 'mn' }, p.bankrupt ? 'Sorti' : `💰 ${p.money}`),
      notes);
  }));
}
export const fortune = (state, pid) => netWorth(state, pid);
export const propCount = (state, pid) => ownedBy(state, pid).length;
