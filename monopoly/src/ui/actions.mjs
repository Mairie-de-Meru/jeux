// Panneau d'actions généré depuis legalActions, et fenêtre « Mes biens ».
import { playerAvatar } from '../render/images.mjs';
import { h, showModal, hideModal } from './dom.mjs';
import { SPACES, GROUP_INFO } from '../logic/board.mjs';
import { legalActions, actor, lvl, ownedBy } from '../logic/rules.mjs';

const find = (l, t) => l.find((a) => a.type === t);

export function panelMessage(state, me) {
  const p = state.players[me]; const who = state.players[actor(state)];
  if (state.over) return 'Partie terminée !';
  const mine = actor(state) === me;
  if (!mine) {
    if (state.phase === 'auction') return `🔨 Enchère en cours… ${who.emoji} ${who.name} réfléchit.`;
    return `${who.emoji} ${who.name} joue…`;
  }
  switch (state.phase) {
    case 'roll': return p.inJail ? '🔒 Tu es en prison. Lance un double, ou sors en payant 50 €.' : (state.doubles ? '🎉 Un double ! Lance encore les dés.' : '🎲 À toi ! Lance les dés.');
    case 'buy': {
      const sp = SPACES[state.pending.space];
      return `Tu es sur ${sp.name}. Prix : ${sp.price} €.`;
    }
    case 'manage': return 'Tu peux construire ou échanger. Puis finis ton tour.';
    case 'debt': {
      const d = state.pending; const miss = Math.max(0, d.amount - p.money);
      return `Tu dois ${d.amount} €${d.creditor != null ? ' à ' + state.players[d.creditor].name : ''}.` + (miss ? ` Il te manque ${miss} €. Vends ou mets un bien en gage.` : ' Tu peux payer !');
    }
    case 'trade': return 'Une offre d’échange t’attend.';
    default: return '';
  }
}

export function renderActions(container, state, me, dispatch, ctx) {
  container.replaceChildren();
  if (state.over || actor(state) !== me) return;
  const l = legalActions(state); const p = state.players[me];
  const add = (label, action, cls = '', fn) => container.append(h('button', { class: cls, onclick: () => (fn ? fn() : dispatch(action)) }, label));
  const addBuild = () => {
    if (!find(l, 'build') || !ctx.openBuild) return;
    const first = ctx.buildFirst && ctx.buildFirst();
    add('🏠 Construire', null, 'build big' + (first ? ' bounce' : ''), () => ctx.openBuild());
  };
  switch (state.phase) {
    case 'roll':
      add('🎲 Lancer les dés', find(l, 'roll'), 'primary big');
      addBuild();
      if (find(l, 'useJailCard')) add('🃏 Carte Évasion', find(l, 'useJailCard'), 'warn');
      if (find(l, 'payJail')) add('💸 Payer 50 €', find(l, 'payJail'), 'warn');
      break;
    case 'buy': {
      const pr = state.pending.price;
      if (find(l, 'buy')) add(`✅ Acheter (${pr} €)`, find(l, 'buy'), 'primary big');
      add(lvl(state).auctions ? '🔨 Enchère' : '➡ Pas maintenant', find(l, 'decline'), 'warn');
      if (!find(l, 'buy')) ctx.calc = `Il te manque ${pr - p.money} €.`;
      else if (lvl(state).aids) ctx.calc = `${p.money} − ${pr} = ${p.money - pr}`;
      break;
    }
    case 'manage':
      add('✔ Finir le tour', find(l, 'endTurn'), 'primary big');
      addBuild();
      break;
    case 'debt':
      if (find(l, 'pay')) add(`💸 Payer ${state.pending.amount} €`, find(l, 'pay'), 'primary big');
      add('🏠 Vendre / gager', null, 'warn', () => ctx.openProps());
      add('😢 Abandonner', null, 'danger', () => ctx.confirmBankrupt());
      if (!find(l, 'pay') && lvl(state).aids) ctx.calc = `${p.money} − ${state.pending.amount} = ${p.money - state.pending.amount}`;
      break;
  }
}

// ----- Mes biens -----
export function propsContent(state, me, view, dispatch, openDeed, close) {
  const l = actor(state) === me ? legalActions(state) : [];
  const owner = state.players[view];
  const items = ownedBy(state, view);
  const rows = items.map((i) => {
    const sp = SPACES[i]; const o = state.owners[i];
    const col = sp.group ? GROUP_INFO[sp.group].color : '#7a8aa6';
    const acts = view === me ? l.filter((a) => a.space === i) : [];
    const btn = (a, label) => h('button', { class: 'mini', onclick: () => dispatch(a) }, label);
    return h('div', { class: 'prow' },
      h('span', { class: 'dot', style: `background:${col}` }),
      h('button', { class: 'pn', onclick: () => openDeed(i) }, `${sp.name} ${o.houses === 5 ? '🏨' : '🏠'.repeat(o.houses)}${o.mortgaged ? ' 🔒' : ''}`),
      ...acts.map((a) => ({
        build: () => btn(a, `➕ ${sp.house}`), sellHouse: () => btn(a, `➖ +${sp.house / 2}`), mortgage: () => btn(a, `🏦 +${sp.mortgage}`),
        unmortgage: () => btn(a, '🔓'), sellToBank: () => btn(a, `💱 +${sp.price / 2}`),
      }[a.type] || (() => null))()));
  });
  return h('div', { class: 'plist' }, h('h2', {}, playerAvatar(owner, 30), ` ${view === me ? 'Mes biens' : owner.name}  ·  💰 ${owner.money}`),
    ...(rows.length ? rows : [h('p', {}, 'Pas encore de terrain. Achète ta première case !')]),
    h('p', { class: 'hint' }, '➕ construire · ➖ revendre · 🏦 gage · 🔓 reprendre · 💱 rendre à la banque'),
    h('div', { class: 'row' }, h('button', { class: 'primary', onclick: close }, 'Fermer')));
}
