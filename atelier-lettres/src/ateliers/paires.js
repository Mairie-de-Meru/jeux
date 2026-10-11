// Atelier 2 : paires (capitale/script/cursive), tri majuscules/minuscules, intrus.
import { getMatchLevel } from '../logic/levels.js';
import { makePairsRound, checkPair, makeSortRound, checkSort, makeIntrusRound, checkIntrus } from '../logic/match.js';
import { createRng } from '../logic/rng.js';
import { makeTile, setSelected, TILE_COLORS } from '../tiles.js';
import { popIn, popOut, jump, shake, moveTo, wait, confetti } from '../fx.js';
import { sfx } from '../audio.js';
import { speech } from '../speech.js';
import { LETTER_NAMES } from '../logic/glyphs.js';
import { createInput, clientOf } from './common.js';

const SP = 1.9;
const PROMPTS = {
  pairs: 'Trouve les paires !',
  sort: 'Range les lettres !',
  intrus: "Trouve l'intrus !",
};

export function createPaires({ stage, ui, finish }) {
  let level = null;
  let rng = createRng(1);
  let subIdx = 0;
  let round = null;
  let items = [];
  let bins = [];
  let selected = null;
  let hints = 0;
  let busy = false;
  let alive = false;
  let remaining = 0;
  let input = null;

  const tilesFn = () => [...items.filter((i) => !i.placed).map((i) => i.tile), ...bins.map((b) => b.tile)];

  function layoutGrid(n, cols) {
    const rows = Math.ceil(n / cols);
    const out = [];
    for (let k = 0; k < n; k++) {
      const r = Math.floor(k / cols);
      const c = k % cols;
      const inRow = r === rows - 1 ? n - cols * (rows - 1) : cols;
      out.push({ x: (c - (inRow - 1) / 2) * SP, y: ((rows - 1) / 2 - r) * SP });
    }
    return out;
  }

  async function build() {
    stage.clearRoot();
    items = [];
    bins = [];
    selected = null;
    const spec = level.rounds[subIdx];
    if (spec.type === 'pairs') round = makePairsRound(rng, spec);
    else if (spec.type === 'sort') round = makeSortRound(rng, spec);
    else round = makeIntrusRound(rng);
    let pos;
    if (round.type === 'pairs') {
      const cols = Math.ceil(round.tiles.length / 2);
      pos = layoutGrid(round.tiles.length, cols);
      stage.setContent(cols * SP + 0.8, 2 * SP + 1);
      remaining = round.tiles.length;
    } else if (round.type === 'sort') {
      pos = layoutGrid(round.tiles.length, 3).map((p) => ({ x: p.x, y: p.y + 1.7 }));
      stage.setContent(7, 6.8);
      remaining = round.tiles.length;
    } else {
      pos = layoutGrid(round.tiles.length, 3).map((p) => ({ x: p.x, y: p.y }));
      stage.setContent(6.6, 4.6);
      remaining = 1;
    }
    round.tiles.forEach((d, k) => {
      const tile = makeTile({ kind: 'letter', letter: d.letter, style: d.style, color: TILE_COLORS[(k * 3 + subIdx) % TILE_COLORS.length] });
      tile.position.set(pos[k].x, pos[k].y, 0);
      const item = { data: d, tile, home: pos[k], placed: false };
      tile.userData.item = item;
      stage.root.add(tile);
      items.push(item);
    });
    if (round.type === 'sort') {
      [['maj', 'ABC', -1.9, 0xff7a45], ['min', 'abc', 1.9, 0x3b9ae8]].forEach(([key, text, x, color]) => {
        const tile = makeTile({ kind: 'bin', text, w: 3.4, h: 2.8, color });
        tile.position.set(x, -2.3, -0.1);
        tile.userData.bin = key;
        tile.userData.count = 0;
        stage.root.add(tile);
        bins.push({ key, tile, x, y: -2.3, w: 3.4, h: 2.8, count: 0 });
      });
    }
    ui.setPrompt(PROMPTS[round.type]);
    ui.setDots(level.rounds.length, subIdx);
    busy = true;
    await Promise.all([...items.map((it, k) => wait(k * 0.05).then(() => popIn(it.tile, { z0: 0, z1: 0 }))), ...bins.map((b) => popIn(b.tile, { z0: -0.1, z1: -0.1 }))]);
    busy = false;
  }

  async function endSub() {
    busy = true;
    sfx.success();
    confetti(80);
    await wait(0.9);
    if (!alive) return;
    subIdx++;
    if (subIdx >= level.rounds.length) {
      ui.setDots(level.rounds.length, subIdx);
      finish('paires', level.id, hints);
      return;
    }
    await build();
  }

  function select(item, on) {
    selected = on ? item : null;
    setSelected(item.tile, on);
  }

  function wrong(msg, ...tiles) {
    hints++;
    sfx.hint();
    ui.hint(msg);
    return Promise.all(tiles.map((t) => shake(t)));
  }

  async function tapItem(item) {
    if (busy || item.placed) return;
    sfx.click();
    if (round.type === 'pairs') {
      if (!selected) { select(item, true); speech.say(LETTER_NAMES[item.data.letter]); return; }
      if (selected === item) { select(item, false); return; }
      const a = selected;
      select(a, false);
      if (checkPair(a.data, item.data)) {
        busy = true;
        a.placed = item.placed = true;
        sfx.pop();
        await Promise.all([jump(a.tile), jump(item.tile)]);
        await Promise.all([popOut(a.tile), popOut(item.tile)]);
        a.tile.visible = item.tile.visible = false;
        remaining -= 2;
        busy = false;
        if (remaining <= 0) await endSub();
      } else {
        busy = true;
        await wrong('Essaie encore !', a.tile, item.tile);
        busy = false;
      }
    } else if (round.type === 'intrus') {
      if (checkIntrus(round, item.data.id)) {
        busy = true;
        sfx.pop();
        await jump(item.tile, { h: 1, dur: 0.5 });
        await endSub();
      } else {
        busy = true;
        item.placed = true;
        await wrong("Ce n'est pas lui !", item.tile);
        await popOut(item.tile, 0.25);
        item.tile.visible = false;
        busy = false;
      }
    } else {
      if (selected === item) select(item, false);
      else { if (selected) select(selected, false); select(item, true); speech.say(LETTER_NAMES[item.data.letter]); }
    }
  }

  async function putInBin(item, bin) {
    if (busy || item.placed) return;
    if (selected) select(selected, false);
    if (checkSort(item.data, bin.key)) {
      busy = true;
      item.placed = true;
      const k = bin.count++;
      const x = bin.x + ((k % 3) - 1) * 1.05;
      const y = bin.y + (k < 3 ? 0.35 : -0.7);
      item.tile.scale.setScalar(0.62);
      sfx.pop();
      await moveTo(item.tile, x, y, 0.3, 0.3);
      remaining--;
      busy = false;
      if (remaining <= 0) await endSub();
    } else {
      busy = true;
      await wrong('Regarde bien la lettre !', item.tile);
      await moveTo(item.tile, item.home.x, item.home.y, 0, 0.25);
      busy = false;
    }
  }

  function onTap(tile) {
    if (tile.userData.bin) {
      const bin = bins.find((b) => b.tile === tile);
      if (selected && bin) putInBin(selected, bin);
      return;
    }
    if (tile.userData.item) tapItem(tile.userData.item);
  }

  function onDrop(tile, p) {
    const item = tile.userData.item;
    if (!item || busy) { if (item) moveTo(tile, item.home.x, item.home.y, 0, 0.25); return; }
    const bin = p && bins.find((b) => Math.abs(p.x - b.x) < b.w / 2 && Math.abs(p.y - b.y) < b.h / 2);
    if (bin) putInBin(item, bin);
    else moveTo(tile, item.home.x, item.home.y, 0, 0.25);
  }

  const api = {
    start(levelId, { seed = Date.now(), index: startIndex = 0 } = {}) {
      api.dispose();
      alive = true;
      level = getMatchLevel(levelId);
      rng = createRng(seed >>> 0);
      subIdx = Math.min(Math.max(0, startIndex), level.rounds.length - 1);
      hints = 0;
      input = createInput(stage, { tiles: tilesFn, draggable: (t) => !!t.userData.item && round && round.type === 'sort', onTap, onDrop });
      input.attach();
      ui.setEmoji('');
      ui.setBar([]);
      return build();
    },
    dispose() {
      alive = false;
      if (input) input.detach();
      input = null;
      stage.clearRoot();
      items = [];
      bins = [];
      selected = null;
    },
    state() {
      return {
        atelier: 'paires', level: level && level.id, index: subIdx, total: level ? level.rounds.length : 0,
        type: round && round.type, hints, busy, remaining, answer: round && round.answer,
        tiles: items.filter((i) => !i.placed).map((i) => ({ id: i.data.id, letter: i.data.letter, style: i.data.style, ...clientOf(stage, i.tile) })),
        bins: bins.map((b) => ({ key: b.key, ...stage.project(b.tile.position.clone()) })),
      };
    },
    tap: (id) => { const it = items.find((i) => i.data.id === id); return it ? tapItem(it) : undefined; },
    drop: (id, key) => { const it = items.find((i) => i.data.id === id); const b = bins.find((x) => x.key === key); return it && b ? putInBin(it, b) : undefined; },
    async solve() {
      const waitIdle = async () => { for (let n = 0; n < 400 && busy; n++) await new Promise((r) => setTimeout(r, 15)); };
      const idx = subIdx;
      await waitIdle();
      if (round.type === 'pairs') {
        for (const a of items.slice()) {
          if (a.placed) continue;
          const b = items.find((x) => !x.placed && checkPair(a.data, x.data));
          if (!b) continue;
          await tapItem(a);
          await tapItem(b);
          await waitIdle();
          if (subIdx !== idx) break;
        }
      } else if (round.type === 'sort') {
        for (const a of items.slice()) {
          if (a.placed) continue;
          await putInBin(a, bins.find((b) => b.key === (a.data.style === 'caps' ? 'maj' : 'min')));
          await waitIdle();
          if (subIdx !== idx) break;
        }
      } else {
        await tapItem(items.find((i) => i.data.id === round.answer));
      }
    },
  };
  return api;
}
