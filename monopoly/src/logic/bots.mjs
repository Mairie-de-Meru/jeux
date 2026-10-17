// Robots : choisissent TOUJOURS une action légale (dans legalActions ; échanges validés par validateTrade).
import { SPACES, GROUPS } from './board.mjs';
import { actor, legalActions, ownedBy, ownsGroup, validateTrade, lvl, activePlayers } from './rules.mjs';

const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
const price = (i) => SPACES[i].price;

// Le terrain i compléterait-il un groupe pour pid ?
function completes(s, pid, i) {
  const sp = SPACES[i];
  if (sp.kind !== 'prop') return false;
  return GROUPS[sp.group].every((j) => j === i || (s.owners[j] && s.owners[j].owner === pid));
}
function groupCountOwned(s, pid, i) {
  const sp = SPACES[i];
  if (sp.kind !== 'prop') return 0;
  return GROUPS[sp.group].filter((j) => s.owners[j] && s.owners[j].owner === pid).length;
}

function tradeValue(s, pid, give, get, level) {
  // valeur reçue - valeur donnée du point de vue de pid (qui reçoit `get`... ici `in` = ce que pid reçoit)
  const valIn = get.money + 50 * get.jailCards + get.props.reduce((a, i) => a + price(i) * (completes(s, pid, i) ? 2.2 : 1), 0);
  let valOut = give.money + 50 * give.jailCards + give.props.reduce((a, i) => a + price(i), 0);
  return { valIn, valOut };
}

function respondTrade(s, pid, level, rng, legal) {
  const t = s.pending;
  // du point de vue du robot : il reçoit t.give (du proposeur) et donne t.get
  const gets = t.give; const gives = t.get;
  const { valIn, valOut: baseOut } = tradeValue(s, pid, gives, gets, level);
  let valOut = baseOut;
  if (level === 'normal') {
    for (const i of gives.props) {
      if (completes(s, t.from, i)) valOut += price(i) * 2.5; // donne un groupe complet à l'adversaire
      if (SPACES[i].kind === 'prop' && ownsGroup(s, pid, SPACES[i].group)) valOut += price(i);
    }
  }
  const ok = level === 'normal' ? valIn >= valOut * 1.05 : valIn >= valOut * 0.9 && rng() < 0.85;
  const want = ok ? 'acceptTrade' : 'rejectTrade';
  return legal.find((a) => a.type === want) || legal[0];
}

function proposeTradeIfAny(s, p, rng) {
  if (!lvl(s).trade || s.tradesThisTurn >= 1) return null;
  if (rng() < 0.35) return null;
  const mine = ownedBy(s, p.id);
  let best = null;
  for (const q of activePlayers(s)) {
    if (q.id === p.id) continue;
    for (const i of ownedBy(s, q.id)) {
      if (!completes(s, p.id, i)) continue;
      const cost = Math.round((price(i) * 1.6) / 10) * 10;
      if (p.money - cost < 150) continue;
      // proposer aussi un terrain isolé en plus d'argent si l'argent ne suffit pas
      const offer = { props: [], money: cost, jailCards: 0 };
      const act = { type: 'proposeTrade', to: q.id, give: offer, get: { props: [i], money: 0, jailCards: 0 } };
      if (!validateTrade(s, act) && (!best || price(i) > best.price)) best = { act, price: price(i) };
    }
  }
  void mine;
  return best ? best.act : null;
}

function manageChoice(s, p, level, rng, legal) {
  const builds = legal.filter((a) => a.type === 'build');
  const unm = legal.filter((a) => a.type === 'unmortgage');
  if (level === 'normal') {
    if (unm.length) {
      const a = unm.sort((x, y) => price(y.space) - price(x.space))[0];
      if (p.money > 450) return a;
    }
    if (builds.length) {
      // priorité : groupe le moins construit, puis le plus cher ; garder une réserve
      const reserve = 120;
      const ok = builds.filter((a) => p.money - SPACES[a.space].house >= reserve && s.owners[a.space].houses < 4);
      if (ok.length) {
        ok.sort((x, y) => s.owners[x.space].houses - s.owners[y.space].houses || price(y.space) - price(x.space));
        return ok[0];
      }
    }
    const tr = proposeTradeIfAny(s, p, rng);
    if (tr) return tr;
  } else {
    if (unm.length && p.money > 800) return unm[0];
    if (builds.length && p.money > 700 && rng() < 0.4) {
      const ok = builds.filter((a) => s.owners[a.space].houses < 3);
      if (ok.length) return pick(rng, ok);
    }
  }
  return null;
}

export function chooseAction(s, playerId, botLevel = 'facile', rng = Math.random) {
  const who = actor(s);
  if (who == null) return null;
  const level = botLevel === 'normal' ? 'normal' : 'facile';
  const p = s.players[who];
  const legal = legalActions(s);
  const find = (type) => legal.find((a) => a.type === type);
  switch (s.phase) {
    case 'roll': {
      if (p.inJail) {
        if (find('useJailCard')) return find('useJailCard');
        if (find('payJail') && p.money > 600 && s.turn < 400 && level === 'normal') return find('payJail');
      }
      return find('roll');
    }
    case 'manage': {
      const m = manageChoice(s, p, level, rng, legal);
      return m || find('endTurn');
    }
    case 'buy': {
      const i = s.pending.space; const pr = s.pending.price;
      const key = completes(s, p.id, i) || SPACES[i].kind !== 'prop' || groupCountOwned(s, p.id, i) > 0;
      const reserve = level === 'normal' ? (key ? 0 : 100) : 100;
      const buy = find('buy');
      if (buy && p.money - pr >= reserve && !(level === 'facile' && rng() < 0.15)) return buy;
      return find('decline');
    }
    case 'auction': {
      const i = s.pending.space; const sp = SPACES[i];
      let maxBid = level === 'normal' ? sp.price * (completes(s, p.id, i) ? 1.2 : 1) : sp.price * 0.8;
      if (level === 'normal' && !completes(s, p.id, i) && groupCountOwned(s, p.id, i) === 0 && sp.kind === 'prop') maxBid = sp.price * 0.85;
      const bids = legal.filter((a) => a.type === 'bid');
      const b = bids[0];
      if (b && b.amount <= maxBid && p.money - b.amount >= 40) return b;
      return find('passBid');
    }
    case 'debt': {
      if (find('pay')) return find('pay');
      const sells = legal.filter((a) => a.type === 'sellHouse');
      if (sells.length) return sells.sort((x, y) => s.owners[y.space].houses - s.owners[x.space].houses || price(x.space) - price(y.space))[0];
      const raise = legal.filter((a) => a.type === 'mortgage' || a.type === 'sellToBank');
      if (raise.length) return raise.sort((x, y) => price(x.space) - price(y.space))[0];
      return find('bankrupt');
    }
    case 'trade': return respondTrade(s, who, level, rng, legal);
  }
  return null;
}
