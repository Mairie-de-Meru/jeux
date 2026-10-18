// Fenêtre d'enchère : +10 / +50 / +100 / Passer.
import { playerAvatar } from '../render/images.mjs';
import { h, showModal, hideModal, hasModal } from './dom.mjs';
import { SPACES } from '../logic/board.mjs';
import { legalActions, actor } from '../logic/rules.mjs';

export function renderAuction(state, me, dispatch) {
  if (state.phase !== 'auction') { hideModal('auction', true); return; }
  const a = state.pending; const sp = SPACES[a.space]; const who = state.players[a.bidder];
  const mine = actor(state) === me;
  const best = a.high != null ? `${a.amount} € par ${state.players[a.high].name}` : 'Aucune offre';
  const body = h('div', {},
    h('h2', {}, `🔨 Enchère : ${sp.name}`),
    h('p', {}, `Prix en boutique : ${sp.price} € · Tu as ${state.players[me].money} €`),
    h('div', { class: 'bidnow' }, best),
    h('p', { class: 'hint' }, ...(mine ? ['À toi ! Choisis une offre ou passe.'] : [playerAvatar(who, 28), ` ${who.name} réfléchit…`])),
    h('div', { class: 'row' },
      ...(mine ? [
        ...legalActions(state).filter((x) => x.type === 'bid').map((x) => h('button', { class: 'primary', onclick: () => dispatch(x) }, `${x.amount} €`)),
        h('button', { class: 'warn', onclick: () => dispatch({ type: 'passBid', player: me }) }, 'Passer'),
      ] : []),
    ));
  const prev = hasModal('auction');
  showModal('auction', body);
  void prev;
}
