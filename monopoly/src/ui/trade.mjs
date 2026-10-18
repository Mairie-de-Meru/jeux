// Échanges : fenêtre de composition (humain) et offre reçue.
import { playerAvatar } from '../render/images.mjs';
import { h, showModal, hideModal } from './dom.mjs';
import { SPACES, GROUP_INFO } from '../logic/board.mjs';
import { ownedBy, validateTrade } from '../logic/rules.mjs';

let draft = null;
const blank = () => ({ props: [], money: 0, jailCards: 0 });
const describe = (state, side) => {
  const parts = side.props.map((i) => SPACES[i].name);
  if (side.money) parts.push(`${side.money} €`);
  if (side.jailCards) parts.push(`${side.jailCards} carte Évasion`);
  return parts.length ? parts.join(', ') : 'rien';
};

export function openTrade(state, me, dispatch) {
  if (state.current !== me || !(state.phase === 'roll' || state.phase === 'manage')) {
    showModal('trade', h('div', {}, h('h2', {}, '🤝 Échanger'), h('p', {}, 'Tu peux proposer un échange pendant ton tour.'), h('div', { class: 'row' }, h('button', { class: 'primary', onclick: () => hideModal('trade') }, 'OK'))));
    return;
  }
  if (!state.players.some((p) => !p.bankrupt && p.id !== me) || !(state.config.level >= 2)) return;
  draft = { to: null, give: blank(), get: blank() };
  drawTrade(state, me, dispatch);
}

function toggle(arr, v) { const k = arr.indexOf(v); if (k >= 0) arr.splice(k, 1); else arr.push(v); }

function side(state, pid, title, s, redraw) {
  const p = state.players[pid];
  const items = ownedBy(state, pid);
  return h('div', { class: 'col' },
    h('b', {}, title),
    h('div', {}, ...items.map((i) => {
      const sp = SPACES[i]; const col = sp.group ? GROUP_INFO[sp.group].color : '#7a8aa6';
      return h('button', { class: 'tg' + (s.props.includes(i) ? ' sel' : ''), style: `border-left:12px solid ${col}`, onclick: () => { toggle(s.props, i); redraw(); } }, sp.name);
    }), items.length ? null : h('span', { class: 'hint' }, 'Aucun terrain')),
    h('div', {}, h('button', { class: 'tg', onclick: () => { s.money = Math.max(0, s.money - 50); redraw(); } }, '−50'),
      h('button', { class: 'tg', onclick: () => { s.money = Math.max(0, s.money - 10); redraw(); } }, '−10'),
      h('b', { style: 'margin:0 6px' }, `${s.money} €`),
      h('button', { class: 'tg', onclick: () => { s.money = Math.min(p.money, s.money + 10); redraw(); } }, '+10'),
      h('button', { class: 'tg', onclick: () => { s.money = Math.min(p.money, s.money + 50); redraw(); } }, '+50')),
    p.jailCards ? h('button', { class: 'tg' + (s.jailCards ? ' sel' : ''), onclick: () => { s.jailCards = s.jailCards ? 0 : 1; redraw(); } }, '🃏 Carte Évasion') : null);
}

function drawTrade(state, me, dispatch) {
  const redraw = () => drawTrade(state, me, dispatch);
  const others = state.players.filter((p) => p.id !== me && !p.bankrupt);
  let body;
  if (draft.to == null) {
    body = h('div', {}, h('h2', {}, '🤝 Échanger avec qui ?'),
      h('div', { class: 'row' }, ...others.map((p) => h('button', { onclick: () => { draft.to = p.id; redraw(); } }, playerAvatar(p, 28), ` ${p.name}`))),
      h('div', { class: 'row' }, h('button', { onclick: () => hideModal('trade') }, 'Annuler')));
  } else {
    const action = { type: 'proposeTrade', to: draft.to, give: draft.give, get: draft.get };
    const err = validateTrade(state, action);
    const to = state.players[draft.to];
    body = h('div', { class: 'trade' }, h('h2', {}, '🤝 Échange avec ', playerAvatar(to, 30), ` ${to.name}`),
      h('div', { class: 'cols' }, side(state, me, 'Je donne', draft.give, redraw), side(state, draft.to, 'Je veux', draft.get, redraw)),
      h('p', { class: 'hint' }, err ? (err === 'offre vide' ? 'Choisis ce que tu donnes et ce que tu veux.' : 'Cet échange n’est pas possible : ' + err + '.') : `Tu donnes : ${describe(state, draft.give)} · Tu reçois : ${describe(state, draft.get)}`),
      h('div', { class: 'row' }, h('button', { onclick: () => { draft.to = null; redraw(); } }, '⬅ Autre joueur'),
        h('button', { class: 'primary', disabled: !!err, onclick: () => { hideModal('trade', true); dispatch(action); } }, 'Proposer'),
        h('button', { onclick: () => hideModal('trade') }, 'Annuler')));
  }
  showModal('trade', body);
}

export function renderIncoming(state, me, dispatch) {
  if (state.phase !== 'trade' || state.pending.to !== me) { hideModal('tradein', true); return; }
  const t = state.pending; const from = state.players[t.from];
  showModal('tradein', h('div', {}, h('h2', {}, '🤝 ', playerAvatar(from, 30), ` ${from.name} te propose un échange`),
    h('p', {}, h('b', {}, 'Il donne : '), describe(state, t.give)),
    h('p', {}, h('b', {}, 'Il veut : '), describe(state, t.get)),
    h('div', { class: 'row' }, h('button', { class: 'primary', onclick: () => dispatch({ type: 'acceptTrade' }) }, '✅ Accepter'), h('button', { class: 'warn', onclick: () => dispatch({ type: 'rejectTrade' }) }, '❌ Refuser'))));
}
