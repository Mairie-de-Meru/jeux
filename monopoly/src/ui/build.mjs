// Fenêtre « Construire » : un bloc par groupe complet, avec la raison quand ➕ manque.
import { h } from './dom.mjs';
import { SPACES, GROUP_INFO, GROUPS } from '../logic/board.mjs';
import { ownsGroup, buildBlockers, lvl, legalActions, actor } from '../logic/rules.mjs';

const REASON = {
  neighbour: 'Construis d’abord sur la rue voisine.',
  money: 'Pas assez d’argent.',
  bank: 'Plus de maisons à la banque.',
  mortgaged: 'Un terrain du groupe est en gage.',
  max: 'Il y a déjà un hôtel !',
};
const houses = (n) => (n === 5 ? '🏨' : n ? '🏠'.repeat(n) : 'terrain nu');

export const completeGroups = (state, me) => Object.keys(GROUPS).filter((g) => ownsGroup(state, me, g));

export function buildContent(state, me, dispatch, close) {
  const l = actor(state) === me ? legalActions(state) : [];
  const groups = completeGroups(state, me); const p = state.players[me];
  const blocks = groups.map((g) => h('div', { class: 'bgroup' },
    h('div', { class: 'bband', style: `background:${GROUP_INFO[g].color}` }, `Maison : ${GROUP_INFO[g].house} € chacune`),
    ...GROUPS[g].map((i) => {
      const sp = SPACES[i]; const o = state.owners[i];
      const act = l.find((a) => a.type === 'build' && a.space === i);
      const why = act ? [] : buildBlockers(state, me, i).filter((r) => REASON[r]);
      return h('div', { class: 'brow' },
        h('div', { class: 'bname' }, h('b', {}, sp.name), h('div', { class: 'bh' }, houses(o.houses)),
          why.length ? h('div', { class: 'why' }, REASON[why[0]]) : null,
          act && lvl(state).aids ? h('div', { class: 'calc' }, `${p.money} − ${sp.house} = ${p.money - sp.house}`) : null),
        act ? h('button', { class: 'primary mini', onclick: () => dispatch(act) }, `➕ ${sp.house}`) : null);
    })));
  return h('div', { class: 'buildwin' }, h('h2', {}, '🏠 Construire'),
    h('p', { class: 'hint' }, `💰 ${p.money} €`),
    ...(blocks.length ? blocks : [h('p', {}, 'Il te faut toutes les rues d’une même couleur.')]),
    h('div', { class: 'row' }, h('button', { class: 'primary', onclick: close }, 'Fermer')));
}
