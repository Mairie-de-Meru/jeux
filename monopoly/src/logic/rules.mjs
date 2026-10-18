// Règles du jeu : fonctions pures sur un état JSON clonable. Aucun DOM, aucun Math.random.
import { SPACES, GROUPS, STATIONS, UTILITIES, GO_MONEY, JAIL_POS, JAIL_FEE, START_MONEY, HOUSES, HOTELS, unmortgageCost } from './board.mjs';
import { DECKS, JAIL_CARD_ID } from './cards.mjs';
import { LEVELS } from './levels.mjs';
import { rngInt, shuffle } from './rng.mjs';

export const BOT_NAMES = [
  { name: 'Renard Roux', emoji: '🦊' },
  { name: 'Lapin Lulu', emoji: '🐰' },
  { name: 'Hibou Hector', emoji: '🦉' },
];
export const PLAYER_COLORS = ['#e5424f', '#3b78e0', '#2fb36b', '#f0a81c'];

const fail = (msg) => { throw new Error('Action illégale : ' + msg); };

// ---------- création ----------
export function createGame(opts = {}) {
  const level = opts.level ?? 2;
  const L = LEVELS[level];
  const rng = { s: ((opts.seed ?? 1) >>> 0) || 1 };
  const specs = opts.players && opts.players.length >= 2 ? opts.players : [
    { name: 'Toi', emoji: '🐱', isBot: false },
    { name: BOT_NAMES[0].name, emoji: BOT_NAMES[0].emoji, isBot: true, botLevel: 'facile' },
  ];
  const players = specs.map((s, i) => ({
    id: i, name: s.name, emoji: s.emoji, color: s.color || PLAYER_COLORS[i % 4],
    isBot: !!s.isBot, botLevel: s.botLevel || 'facile', pawn: s.pawn || null,
    money: START_MONEY, pos: 0, inJail: false, jailTurns: 0, jailCards: 0, jailFrom: [], bankrupt: false, bankruptTurn: 0,
  }));
  return {
    config: { level, maxTurns: opts.maxTurns ?? 1500, minutes: opts.minutes ?? L.minutes, seed: opts.seed ?? 1 },
    rng, turn: 1, current: 0, phase: 'roll', players, owners: {},
    bank: { houses: HOUSES, hotels: HOTELS },
    decks: { surprise: shuffle(rng, DECKS.surprise.map((_, i) => i)), tirelire: shuffle(rng, DECKS.tirelire.map((_, i) => i)) },
    dice: [0, 0], doubles: 0, pending: null, log: [], events: [], over: false, winner: null, final: null,
    startedAt: opts.startedAt ?? 0, tradesThisTurn: 0, lastCard: null,
  };
}

// ---------- accès ----------
export const lvl = (s) => LEVELS[s.config.level];
export const cur = (s) => s.players[s.current];
export const activePlayers = (s) => s.players.filter((p) => !p.bankrupt);
const ownerOf = (s, i) => (s.owners[i] ? s.owners[i].owner : -1);
export const ownedBy = (s, pid) => Object.keys(s.owners).map(Number).filter((i) => s.owners[i].owner === pid).sort((a, b) => a - b);
export const ownsGroup = (s, pid, group) => GROUPS[group].every((i) => ownerOf(s, i) === pid);
const houseOf = (s, i) => (s.owners[i] ? s.owners[i].houses : 0);
const groupHouses = (s, group) => GROUPS[group].map((i) => houseOf(s, i));
const groupHasHouses = (s, group) => groupHouses(s, group).some((h) => h > 0);
const groupHasMortgage = (s, group) => GROUPS[group].some((i) => s.owners[i] && s.owners[i].mortgaged);
const countKind = (s, pid, list) => list.filter((i) => ownerOf(s, i) === pid).length;
const nm = (s, pid) => s.players[pid].name;

export function actor(s) {
  if (s.over) return null;
  if (s.phase === 'auction') return s.pending.bidder;
  if (s.phase === 'trade') return s.pending.to;
  return s.current;
}

// Joueur local (« passe et joue ») : l'humain qui doit agir ; sinon le dernier humain affiché (prev) s'il est encore en jeu,
// sinon le premier humain actif. Pur : prev est fourni par l'appelant.
export function localHuman(s, prev = null) {
  const a = actor(s);
  if (a != null && !s.players[a].isBot) return a;
  const p = prev != null ? s.players[prev] : null;
  if (p && !p.isBot && !p.bankrupt) return prev;
  const hum = s.players.find((q) => !q.isBot && !q.bankrupt) || s.players.find((q) => !q.isBot);
  return hum ? hum.id : 0;
}
export const humansInGame = (s) => s.players.filter((p) => !p.isBot && !p.bankrupt).length;

// Bandeau « À <prénom> … » : seulement s'il y a plusieurs humains en partie et qu'un humain doit décider.
export function turnBanner(s) {
  if (s.over || humansInGame(s) < 2) return null;
  const a = actor(s); if (a == null) return null;
  const p = s.players[a]; if (p.isBot) return null;
  const text = s.phase === 'auction' ? `À ${p.name} d’enchérir` : s.phase === 'trade' ? `${p.name}, une offre pour toi` : `À ${p.name} de jouer`;
  return { pid: a, text, color: p.color };
}

function ev(s, type, data = {}) {
  const e = { type, ...data };
  s.events.push(e);
  if (e.text) { s.log.push(e.text); if (s.log.length > 40) s.log.shift(); }
  return e;
}

// ---------- loyers et valeur ----------
export function rent(s, i, dice = s.dice[0] + s.dice[1], opts = {}) {
  const o = s.owners[i];
  if (!o || o.mortgaged) return 0;
  const sp = SPACES[i];
  if (sp.kind === 'prop') {
    if (o.houses > 0) return sp.rents[o.houses];
    return ownsGroup(s, o.owner, sp.group) ? sp.rents[0] * 2 : sp.rents[0];
  }
  if (sp.kind === 'station') {
    const r = sp.rents[countKind(s, o.owner, STATIONS) - 1];
    return opts.station2 ? r * 2 : r;
  }
  if (sp.kind === 'utility') {
    const both = countKind(s, o.owner, UTILITIES) === 2;
    return dice * (opts.utility10 || both ? 10 : 4);
  }
  return 0;
}

export function netWorth(s, pid) {
  const p = s.players[pid];
  let n = p.money;
  for (const i of ownedBy(s, pid)) {
    const o = s.owners[i]; const sp = SPACES[i];
    n += o.mortgaged ? sp.price / 2 : sp.price;
    if (sp.kind === 'prop') n += o.houses * sp.house;
  }
  return n;
}

export function ranking(s) {
  const act = s.players.filter((p) => !p.bankrupt).map((p) => ({ id: p.id, net: netWorth(s, p.id), bankrupt: false }));
  act.sort((a, b) => b.net - a.net || a.id - b.id);
  const out = s.players.filter((p) => p.bankrupt).sort((a, b) => b.bankruptTurn - a.bankruptTurn)
    .map((p) => ({ id: p.id, net: 0, bankrupt: true }));
  return act.concat(out);
}

// ---------- prédicats ----------
const canManagePhase = (s) => s.phase === 'roll' || s.phase === 'manage';
const canSellPhase = (s) => s.phase === 'roll' || s.phase === 'manage' || s.phase === 'debt';

export function canBuild(s, pid, i) {
  const sp = SPACES[i]; const o = s.owners[i];
  if (!lvl(s).build || sp.kind !== 'prop' || !o || o.owner !== pid) return false;
  if (!ownsGroup(s, pid, sp.group) || groupHasMortgage(s, sp.group)) return false;
  if (o.houses >= 5) return false;
  if (o.houses > Math.min(...groupHouses(s, sp.group))) return false;
  if (s.players[pid].money < sp.house) return false;
  return o.houses < 4 ? s.bank.houses >= 1 : s.bank.hotels >= 1;
}
// Raisons pour lesquelles on ne peut pas (encore) construire sur la case i ; [] si c'est possible.
// Codes : level, notOwner, incomplete, mortgaged, max, neighbour, money, bank.
export function buildBlockers(s, pid, i) {
  const sp = SPACES[i]; const o = s.owners[i];
  if (!lvl(s).build) return ['level'];
  if (sp.kind !== 'prop' || !o || o.owner !== pid) return ['notOwner'];
  if (!ownsGroup(s, pid, sp.group)) return ['incomplete'];
  const out = [];
  if (groupHasMortgage(s, sp.group)) out.push('mortgaged');
  if (o.houses >= 5) return ['max'];
  if (o.houses > Math.min(...groupHouses(s, sp.group))) out.push('neighbour');
  if (s.players[pid].money < sp.house) out.push('money');
  if (o.houses < 4 ? s.bank.houses < 1 : s.bank.hotels < 1) out.push('bank');
  return out;
}
export function canSellHouse(s, pid, i) {
  const sp = SPACES[i]; const o = s.owners[i];
  if (!lvl(s).build || sp.kind !== 'prop' || !o || o.owner !== pid || o.houses <= 0) return false;
  if (o.houses < Math.max(...groupHouses(s, sp.group))) return false;
  return o.houses < 5 || s.bank.houses >= 4;
}
export function canMortgage(s, pid, i) {
  const sp = SPACES[i]; const o = s.owners[i];
  if (!lvl(s).mortgage || !o || o.owner !== pid || o.mortgaged) return false;
  return sp.kind !== 'prop' || !groupHasHouses(s, sp.group);
}
export function canUnmortgage(s, pid, i) {
  const o = s.owners[i];
  return !!(lvl(s).mortgage && o && o.owner === pid && o.mortgaged && s.players[pid].money >= unmortgageCost(i));
}
export function canSellToBank(s, pid, i) {
  const o = s.owners[i];
  return !!(!lvl(s).mortgage && s.phase === 'debt' && o && o.owner === pid && !o.mortgaged);
}

// ---------- échanges ----------
const normSide = (x = {}) => ({ props: (x.props || []).slice(), money: x.money || 0, jailCards: x.jailCards || 0 });
export function validateTrade(s, a) {
  if (!lvl(s).trade) return 'échanges indisponibles à ce palier';
  if (!canManagePhase(s)) return 'mauvais moment';
  const from = s.current; const to = a.to;
  if (!Number.isInteger(to) || to === from || !s.players[to] || s.players[to].bankrupt) return 'joueur invalide';
  const give = normSide(a.give); const get = normSide(a.get);
  if (!give.props.length && !get.props.length && !give.money && !get.money && !give.jailCards && !get.jailCards) return 'offre vide';
  const chk = (side, pid) => {
    const p = s.players[pid];
    if (!Number.isInteger(side.money) || side.money < 0 || side.money > p.money) return 'argent invalide';
    if (!Number.isInteger(side.jailCards) || side.jailCards < 0 || side.jailCards > p.jailCards) return 'cartes invalides';
    if (new Set(side.props).size !== side.props.length) return 'doublon';
    for (const i of side.props) {
      if (!Number.isInteger(i) || ownerOf(s, i) !== pid) return 'terrain non possédé';
      const sp = SPACES[i];
      if (sp.kind === 'prop' && groupHasHouses(s, sp.group)) return 'terrain bâti';
    }
    return null;
  };
  return chk(give, from) || chk(get, to);
}

// ---------- actions possibles ----------
function manageActions(s, p, out) {
  const owned = ownedBy(s, p.id);
  for (const i of owned) if (canBuild(s, p.id, i)) out.push({ type: 'build', space: i });
  for (const i of owned) if (canSellHouse(s, p.id, i)) out.push({ type: 'sellHouse', space: i });
  for (const i of owned) if (canMortgage(s, p.id, i)) out.push({ type: 'mortgage', space: i });
  for (const i of owned) if (canUnmortgage(s, p.id, i)) out.push({ type: 'unmortgage', space: i });
  if (lvl(s).trade && owned.length + p.jailCards + 1 > 0) {
    for (const q of s.players) if (q.id !== p.id && !q.bankrupt) out.push({ type: 'proposeTrade', to: q.id, template: true });
  }
}

export function legalActions(s) {
  if (s.over) return [];
  const p = cur(s); const out = [];
  switch (s.phase) {
    case 'roll':
      out.push({ type: 'roll' });
      if (p.inJail) {
        if (p.jailCards > 0) out.push({ type: 'useJailCard' });
        if (p.money >= JAIL_FEE) out.push({ type: 'payJail' });
      }
      manageActions(s, p, out);
      break;
    case 'manage':
      out.push({ type: 'endTurn' });
      manageActions(s, p, out);
      break;
    case 'buy':
      out.push({ type: 'decline' });
      if (p.money >= s.pending.price) out.unshift({ type: 'buy' });
      break;
    case 'auction': {
      const b = s.pending.bidder; const bp = s.players[b];
      for (const d of [10, 50, 100]) { const amount = s.pending.amount + d; if (amount <= bp.money) out.push({ type: 'bid', player: b, amount }); }
      out.push({ type: 'passBid', player: b });
      break;
    }
    case 'debt': {
      if (p.money >= s.pending.amount) out.push({ type: 'pay' });
      for (const i of ownedBy(s, p.id)) if (canSellHouse(s, p.id, i)) out.push({ type: 'sellHouse', space: i });
      for (const i of ownedBy(s, p.id)) if (canMortgage(s, p.id, i)) out.push({ type: 'mortgage', space: i });
      for (const i of ownedBy(s, p.id)) if (canSellToBank(s, p.id, i)) out.push({ type: 'sellToBank', space: i });
      out.push({ type: 'bankrupt' });
      break;
    }
    case 'trade':
      out.push({ type: 'acceptTrade' }, { type: 'rejectTrade' });
      break;
  }
  return out;
}

// ---------- mouvements et cases ----------
function creditGo(s, pid) {
  s.players[pid].money += GO_MONEY;
  ev(s, 'passGo', { p: pid, amount: GO_MONEY, text: `${nm(s, pid)} passe par le Départ : +${GO_MONEY}.` });
}

function moveSteps(s, pid, steps, collect = true) {
  const p = s.players[pid]; const from = p.pos;
  const to = (((from + steps) % 40) + 40) % 40;
  const wrapped = steps > 0 && from + steps >= 40;
  p.pos = to;
  ev(s, 'move', { p: pid, from, to, steps });
  if (wrapped && collect) creditGo(s, pid);
}
function teleport(s, pid, to) {
  const p = s.players[pid]; const from = p.pos;
  p.pos = to;
  ev(s, 'move', { p: pid, from, to, steps: 0, teleport: true });
}
function sendToJail(s, pid) {
  const p = s.players[pid]; const from = p.pos;
  p.pos = JAIL_POS; p.inJail = true; p.jailTurns = 0; s.doubles = 0;
  ev(s, 'jail', { p: pid, from, text: `${nm(s, pid)} va en prison.` });
  if (from !== JAIL_POS) ev(s, 'move', { p: pid, from, to: JAIL_POS, steps: 0, teleport: true });
}
function releaseJail(s, pid, text) {
  const p = s.players[pid]; p.inJail = false; p.jailTurns = 0;
  if (text) ev(s, 'free', { p: pid, text });
}

function afterLand(s) {
  const p = cur(s);
  s.pending = null;
  if (s.over) return;
  s.phase = s.doubles > 0 && !p.inJail ? 'roll' : 'manage';
}

// Prélève un montant ; renvoie true si payé tout de suite, sinon ouvre la phase dette.
function charge(s, pid, amount, creditor, extra = {}) {
  const p = s.players[pid];
  if (amount <= 0) return true;
  const total = extra.split ? amount : amount;
  if (p.money >= total) {
    pay(s, pid, { amount, creditor, split: extra.split });
    return true;
  }
  s.phase = 'debt';
  s.pending = { kind: 'debt', amount: total, creditor: creditor ?? null, split: extra.split || null, after: extra.after || null, reason: extra.reason || '' };
  ev(s, 'debt', { p: pid, amount: total, creditor: creditor ?? null, text: `${nm(s, pid)} doit ${total}.` });
  return false;
}
function pay(s, pid, d) {
  const p = s.players[pid];
  p.money -= d.amount;
  if (d.split) for (const q of d.split.to) s.players[q].money += d.split.each;
  else if (d.creditor != null) s.players[d.creditor].money += d.amount;
  ev(s, 'pay', { p: pid, to: d.creditor ?? null, amount: d.amount });
}

function offer(s, pid, i) {
  const p = s.players[pid]; const sp = SPACES[i];
  if (p.money >= sp.price) {
    s.phase = 'buy'; s.pending = { kind: 'buy', space: i, price: sp.price };
    return;
  }
  ev(s, 'cantBuy', { p: pid, space: i, text: `${nm(s, pid)} n’a pas assez pour ${sp.name}.` });
  if (lvl(s).auctions) startAuction(s, i, pid); else afterLand(s);
}

function land(s, pid, opts = {}) {
  const p = s.players[pid]; const sp = SPACES[p.pos];
  switch (sp.kind) {
    case 'gotojail': sendToJail(s, pid); return afterLand(s);
    case 'tax':
      ev(s, 'tax', { p: pid, amount: sp.amount, space: sp.i, text: `${nm(s, pid)} paie ${sp.amount} (${sp.name}).` });
      if (charge(s, pid, sp.amount, null, { reason: 'tax' })) afterLand(s);
      return;
    case 'surprise': case 'tirelire': return drawCard(s, pid, sp.kind);
    case 'prop': case 'station': case 'utility': {
      const o = s.owners[sp.i];
      if (!o) return offer(s, pid, sp.i);
      if (o.owner === pid || o.mortgaged) return afterLand(s);
      const amount = rent(s, sp.i, s.dice[0] + s.dice[1], opts);
      ev(s, 'rent', { p: pid, to: o.owner, space: sp.i, amount, text: `${nm(s, pid)} paie ${amount} à ${nm(s, o.owner)} (${sp.name}).` });
      if (charge(s, pid, amount, o.owner, { reason: 'rent' })) afterLand(s);
      return;
    }
    default: return afterLand(s);
  }
}

function nearest(s, pid, list) {
  const pos = s.players[pid].pos;
  for (let k = 1; k <= 40; k++) { const i = (pos + k) % 40; if (list.includes(i)) return i; }
  return list[0];
}

function drawCard(s, pid, deck) {
  const p = s.players[pid];
  const id = s.decks[deck].shift();
  const card = DECKS[deck][id];
  s.lastCard = { deck, id, text: card.text, p: pid };
  ev(s, 'card', { p: pid, deck, id, text: `${deck === 'surprise' ? '❓' : '🧰'} ${card.text}` });
  const e = card.effect;
  if (e.t === 'jailCard') { p.jailCards++; p.jailFrom.push(deck); } else s.decks[deck].push(id);
  switch (e.t) {
    case 'money':
      if (e.n >= 0) { p.money += e.n; ev(s, 'receive', { p: pid, amount: e.n }); return afterLand(s); }
      if (charge(s, pid, -e.n, null, { reason: 'card' })) afterLand(s);
      return;
    case 'moveTo': {
      if (e.go) moveSteps(s, pid, (e.i - p.pos + 40) % 40 || 40, true); else teleport(s, pid, e.i);
      return land(s, pid);
    }
    case 'moveBy': moveSteps(s, pid, e.n, false); return land(s, pid);
    case 'nearestStation': moveSteps(s, pid, (nearest(s, pid, STATIONS) - p.pos + 40) % 40, true); return land(s, pid, { station2: true });
    case 'nearestUtility': moveSteps(s, pid, (nearest(s, pid, UTILITIES) - p.pos + 40) % 40, true); return land(s, pid, { utility10: true });
    case 'jail': sendToJail(s, pid); return afterLand(s);
    case 'jailCard': return afterLand(s);
    case 'payEach': {
      const to = activePlayers(s).filter((q) => q.id !== pid).map((q) => q.id);
      if (charge(s, pid, e.n * to.length, null, { split: { each: e.n, to }, reason: 'card' })) afterLand(s);
      return;
    }
    case 'collectEach': {
      let got = 0;
      for (const q of activePlayers(s)) if (q.id !== pid) { const x = Math.min(q.money, e.n); q.money -= x; got += x; }
      p.money += got; ev(s, 'receive', { p: pid, amount: got });
      return afterLand(s);
    }
    case 'repairs': {
      let h = 0; let ht = 0;
      for (const i of ownedBy(s, pid)) { const n = s.owners[i].houses; if (n === 5) ht++; else h += n; }
      const total = h * e.house + ht * e.hotel;
      if (charge(s, pid, total, null, { reason: 'card' })) afterLand(s);
      return;
    }
  }
}

// ---------- enchères ----------
function startAuction(s, i, fromPid) {
  s.phase = 'auction';
  s.pending = { kind: 'auction', space: i, amount: 0, high: null, passed: [], bidder: -1 };
  ev(s, 'auctionStart', { space: i, text: `Enchère : ${SPACES[i].name} !` });
  advanceAuction(s, fromPid);
}
function advanceAuction(s, last) {
  const a = s.pending; const n = s.players.length;
  for (let k = 1; k <= n; k++) {
    const q = (last + k) % n; const pl = s.players[q];
    if (pl.bankrupt || a.passed.includes(q) || a.high === q) continue;
    if (pl.money < a.amount + 10) { a.passed.push(q); continue; }
    a.bidder = q; return;
  }
  endAuction(s);
}
function endAuction(s) {
  const a = s.pending; const sp = SPACES[a.space];
  if (a.high != null) {
    s.players[a.high].money -= a.amount;
    s.owners[a.space] = { owner: a.high, houses: 0, mortgaged: false };
    ev(s, 'auctionWin', { p: a.high, space: a.space, amount: a.amount, text: `${nm(s, a.high)} gagne ${sp.name} pour ${a.amount}.` });
  } else ev(s, 'auctionNone', { space: a.space, text: `Personne n’a pris ${sp.name}.` });
  afterLand(s);
}

// ---------- faillite, tours, fin ----------
function finish(s, reason) {
  const r = ranking(s);
  s.over = true; s.phase = 'over'; s.pending = null; s.winner = r[0].id; s.final = { reason, ranking: r.map((x) => ({ ...x, net: x.bankrupt ? 0 : netWorth(s, x.id) })) };
  ev(s, 'over', { winner: s.winner, reason, text: `Fin de partie : ${nm(s, s.winner)} gagne !` });
}
function nextTurn(s) {
  const n = s.players.length;
  for (let k = 1; k <= n; k++) {
    const q = (s.current + k) % n;
    if (!s.players[q].bankrupt) { s.current = q; break; }
  }
  s.turn++; s.doubles = 0; s.tradesThisTurn = 0; s.pending = null; s.phase = 'roll';
  if (s.turn > s.config.maxTurns) return finish(s, 'maxTurns');
  ev(s, 'turn', { p: s.current, text: `Tour de ${nm(s, s.current)}.` });
}
function giveBackJailCards(s, p) {
  for (const d of p.jailFrom) s.decks[d].push(JAIL_CARD_ID[d]);
  p.jailFrom = []; p.jailCards = 0;
}
function declareBankrupt(s, pid, creditor) {
  const p = s.players[pid];
  for (const i of ownedBy(s, pid)) {
    const o = s.owners[i];
    if (o.houses === 5) s.bank.hotels++; else s.bank.houses += o.houses;
    o.houses = 0;
    if (creditor != null) o.owner = creditor; else delete s.owners[i];
  }
  if (creditor != null) {
    const c = s.players[creditor];
    c.money += p.money; c.jailCards += p.jailCards; c.jailFrom.push(...p.jailFrom);
    p.jailFrom = []; p.jailCards = 0;
  } else giveBackJailCards(s, p);
  p.money = 0; p.bankrupt = true; p.bankruptTurn = s.turn;
  ev(s, 'bankrupt', { p: pid, to: creditor ?? null, text: `${nm(s, pid)} quitte la partie.` });
  s.pending = null; s.doubles = 0;
  if (activePlayers(s).length <= 1) { s.phase = 'manage'; return finish(s, 'lastStanding'); }
  nextTurn(s);
}

// ---------- application d'une action ----------
export function applyAction(state0, action) {
  const s = structuredClone(state0);
  s.events = [];
  if (s.over) fail('partie terminée');
  const t = action && action.type;
  if (t === 'timeUp') { finish(s, 'timeUp'); return { state: s, events: s.events }; }
  const p = cur(s);
  const need = (cond, msg = t) => { if (!cond) fail(msg + ' (' + s.phase + ')'); };
  switch (t) {
    case 'roll': {
      need(s.phase === 'roll');
      let d1; let d2;
      if (action.dice) {
        [d1, d2] = action.dice;
        need(Number.isInteger(d1) && Number.isInteger(d2) && d1 >= 1 && d1 <= 6 && d2 >= 1 && d2 <= 6, 'dés invalides');
      } else { d1 = rngInt(s.rng, 6) + 1; d2 = rngInt(s.rng, 6) + 1; }
      s.dice = [d1, d2];
      const dbl = d1 === d2; const total = d1 + d2;
      ev(s, 'roll', { p: p.id, dice: [d1, d2], text: `${p.name} lance : ${d1} et ${d2}.` });
      if (p.inJail) {
        if (dbl) {
          releaseJail(s, p.id, `${p.name} fait un double et sort de prison !`);
          s.doubles = 0; moveSteps(s, p.id, total); land(s, p.id);
        } else {
          p.jailTurns++;
          if (p.jailTurns >= 3) {
            ev(s, 'jailFee', { p: p.id, text: `${p.name} paie ${JAIL_FEE} pour sortir.` });
            if (charge(s, p.id, JAIL_FEE, null, { reason: 'jail', after: { move: total } })) {
              releaseJail(s, p.id); moveSteps(s, p.id, total); land(s, p.id);
            }
          } else { s.phase = 'manage'; ev(s, 'stay', { p: p.id, text: `${p.name} reste en prison.` }); }
        }
        break;
      }
      if (dbl) {
        s.doubles++;
        if (s.doubles >= 3) { ev(s, 'speeding', { p: p.id, text: 'Trois doubles !' }); sendToJail(s, p.id); afterLand(s); break; }
      } else s.doubles = 0;
      moveSteps(s, p.id, total); land(s, p.id);
      break;
    }
    case 'payJail':
      need(s.phase === 'roll' && p.inJail && p.money >= JAIL_FEE);
      pay(s, p.id, { amount: JAIL_FEE, creditor: null });
      releaseJail(s, p.id, `${p.name} paie ${JAIL_FEE} et sort de prison.`);
      break;
    case 'useJailCard': {
      need(s.phase === 'roll' && p.inJail && p.jailCards > 0);
      const d = p.jailFrom.pop(); p.jailCards--; s.decks[d].push(JAIL_CARD_ID[d]);
      releaseJail(s, p.id, `${p.name} utilise la carte Évasion.`);
      break;
    }
    case 'buy': {
      need(s.phase === 'buy' && p.money >= s.pending.price);
      const { space, price } = s.pending;
      p.money -= price; s.owners[space] = { owner: p.id, houses: 0, mortgaged: false };
      ev(s, 'buy', { p: p.id, space, amount: price, text: `${p.name} achète ${SPACES[space].name} (${price}).` });
      afterLand(s);
      break;
    }
    case 'decline': {
      need(s.phase === 'buy');
      const { space } = s.pending;
      ev(s, 'decline', { p: p.id, space, text: `${p.name} ne prend pas ${SPACES[space].name}.` });
      if (lvl(s).auctions) startAuction(s, space, p.id); else afterLand(s);
      break;
    }
    case 'bid': {
      need(s.phase === 'auction' && action.player === s.pending.bidder);
      const a = s.pending; const b = s.players[a.bidder];
      need(Number.isInteger(action.amount) && action.amount >= a.amount + 10 && action.amount <= b.money, 'mise invalide');
      a.amount = action.amount; a.high = a.bidder;
      ev(s, 'bid', { p: a.bidder, amount: a.amount, text: `${b.name} mise ${a.amount}.` });
      advanceAuction(s, a.bidder);
      break;
    }
    case 'passBid': {
      need(s.phase === 'auction' && action.player === s.pending.bidder);
      const a = s.pending; a.passed.push(a.bidder);
      ev(s, 'passBid', { p: a.bidder, text: `${s.players[a.bidder].name} passe.` });
      advanceAuction(s, a.bidder);
      break;
    }
    case 'build': {
      need(canManagePhase(s) && canBuild(s, p.id, action.space));
      const o = s.owners[action.space]; const sp = SPACES[action.space];
      p.money -= sp.house;
      if (o.houses === 4) { s.bank.hotels--; s.bank.houses += 4; } else s.bank.houses--;
      o.houses++;
      ev(s, 'build', { p: p.id, space: action.space, houses: o.houses, text: `${p.name} construit ${o.houses === 5 ? 'un hôtel' : 'une maison'} (${sp.name}).` });
      break;
    }
    case 'sellHouse': {
      need(canSellPhase(s) && canSellHouse(s, p.id, action.space));
      const o = s.owners[action.space]; const sp = SPACES[action.space];
      p.money += sp.house / 2;
      if (o.houses === 5) { s.bank.hotels++; s.bank.houses -= 4; } else s.bank.houses++;
      o.houses--;
      ev(s, 'sell', { p: p.id, space: action.space, houses: o.houses, text: `${p.name} revend une maison (${sp.name}) : +${sp.house / 2}.` });
      break;
    }
    case 'mortgage': {
      need(canSellPhase(s) && canMortgage(s, p.id, action.space));
      const sp = SPACES[action.space];
      s.owners[action.space].mortgaged = true; p.money += sp.mortgage;
      ev(s, 'mortgage', { p: p.id, space: action.space, text: `${p.name} met ${sp.name} en gage : +${sp.mortgage}.` });
      break;
    }
    case 'unmortgage': {
      need(canManagePhase(s) && canUnmortgage(s, p.id, action.space));
      const cost = unmortgageCost(action.space);
      s.owners[action.space].mortgaged = false; p.money -= cost;
      ev(s, 'unmortgage', { p: p.id, space: action.space, amount: cost, text: `${p.name} reprend ${SPACES[action.space].name} (−${cost}).` });
      break;
    }
    case 'sellToBank': {
      need(canSellToBank(s, p.id, action.space));
      const sp = SPACES[action.space];
      delete s.owners[action.space]; p.money += sp.price / 2;
      ev(s, 'sellBank', { p: p.id, space: action.space, text: `${p.name} rend ${sp.name} à la banque : +${sp.price / 2}.` });
      break;
    }
    case 'pay': {
      need(s.phase === 'debt' && p.money >= s.pending.amount);
      const d = s.pending;
      pay(s, p.id, d);
      s.pending = null;
      if (d.after && d.after.move) { releaseJail(s, p.id); moveSteps(s, p.id, d.after.move); land(s, p.id); } else afterLand(s);
      break;
    }
    case 'bankrupt':
      need(s.phase === 'debt');
      declareBankrupt(s, p.id, s.pending.creditor);
      break;
    case 'endTurn':
      need(s.phase === 'manage');
      nextTurn(s);
      break;
    case 'proposeTrade': {
      const err = validateTrade(s, action);
      if (err) fail('échange : ' + err);
      s.pending = { kind: 'trade', from: p.id, to: action.to, give: normSide(action.give), get: normSide(action.get), prev: s.phase };
      s.phase = 'trade'; s.tradesThisTurn++;
      ev(s, 'trade', { p: p.id, to: action.to, text: `${p.name} propose un échange à ${nm(s, action.to)}.` });
      break;
    }
    case 'acceptTrade': {
      need(s.phase === 'trade');
      const t0 = s.pending; s.phase = t0.prev;
      const err = validateTrade(s, { to: t0.to, give: t0.give, get: t0.get });
      if (err) fail('échange : ' + err);
      transfer(s, t0.from, t0.to, t0.give); transfer(s, t0.to, t0.from, t0.get);
      s.pending = null;
      ev(s, 'tradeOk', { p: t0.from, to: t0.to, text: `${nm(s, t0.to)} accepte l’échange !` });
      break;
    }
    case 'rejectTrade': {
      need(s.phase === 'trade');
      const t0 = s.pending; s.phase = t0.prev; s.pending = null;
      ev(s, 'tradeNo', { p: t0.from, to: t0.to, text: `${nm(s, t0.to)} refuse l’échange.` });
      break;
    }
    default: fail('inconnue ' + t);
  }
  return { state: s, events: s.events };
}

function transfer(s, from, to, side) {
  const a = s.players[from]; const b = s.players[to];
  a.money -= side.money; b.money += side.money;
  for (const i of side.props) s.owners[i].owner = to;
  for (let k = 0; k < side.jailCards; k++) { a.jailCards--; b.jailCards++; b.jailFrom.push(a.jailFrom.pop()); }
}

// Une action est légale si elle figure dans legalActions (échanges : validés séparément).
export function isLegal(s, action) {
  if (!action) return false;
  if (action.type === 'timeUp') return !s.over;
  if (action.type === 'proposeTrade') return canManagePhase(s) && !s.over && !validateTrade(s, action);
  return legalActions(s).some((a) => JSON.stringify(a) === JSON.stringify(action));
}
