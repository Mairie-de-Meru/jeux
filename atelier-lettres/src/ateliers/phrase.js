// Atelier 3 : remettre les mots d'une phrase dans l'ordre, puis majuscule au début et point à la fin.
import { getSentenceLevel } from '../logic/levels.js';
import { SENTENCES, prepareWords, shuffleWords, checkOrder, checkFinish, finalText } from '../logic/sentences.js';
import { createRng } from '../logic/rng.js';
import { makeTile, retexture, wordWidth, TILE_COLORS } from '../tiles.js';
import { popIn, jump, shake, moveTo, wait, confetti } from '../fx.js';
import { sfx } from '../audio.js';
import { speech } from '../speech.js';
import { HINT_TEXT, btn } from '../ui.js';
import { createInput, clientOf } from './common.js';

const MAX_W = 10.2;
const GAP = 0.25;
const ROW_H = 1.6;
const upperFirst = (w) => w.charAt(0).toUpperCase() + w.slice(1);

// Dispose des largeurs en lignes centrées ; renvoie les positions (x, y relatifs) et la largeur max.
function flow(widths, y0) {
  const rows = [[]];
  let cur = 0;
  widths.forEach((w, i) => {
    if (cur && cur + GAP + w > MAX_W) { rows.push([]); cur = 0; }
    rows[rows.length - 1].push(i);
    cur += (cur ? GAP : 0) + w;
  });
  const pos = [];
  let maxW = 0;
  rows.forEach((idxs, r) => {
    const total = idxs.reduce((s, i) => s + widths[i], 0) + GAP * (idxs.length - 1);
    maxW = Math.max(maxW, total);
    let x = -total / 2;
    for (const i of idxs) {
      pos[i] = { x: x + widths[i] / 2, y: y0 - r * ROW_H };
      x += widths[i] + GAP;
    }
  });
  return { pos, rows: rows.length, maxW };
}

export function createPhrase({ stage, ui, finish }) {
  let level = null;
  let rng = createRng(1);
  let sentences = [];
  let index = 0;
  let sentence = null;
  let words = [];
  let slots = [];
  let punctSlot = null;
  let punctTile = null;
  let phase = 'order';
  let capitalized = false;
  let hasPoint = false;
  let hints = 0;
  let busy = false;
  let alive = false;
  let input = null;
  let capBtn = null;
  let ptBtn = null;

  const tilesFn = () => (phase === 'order' && !busy ? words.map((w) => w.tile) : []);

  async function build() {
    stage.clearRoot();
    sentence = sentences[index];
    phase = 'order';
    capitalized = false;
    hasPoint = false;
    punctTile = null;
    const prepared = prepareWords(sentence);
    const widths = prepared.map((w) => wordWidth(upperFirst(w.text)));
    const slotFlow = flow([...widths, 1.3], 2.3);
    const poolShuffled = shuffleWords(prepared, rng);
    const poolWidths = poolShuffled.map((w) => wordWidth(upperFirst(w.text)));
    const poolY = 2.3 - slotFlow.rows * ROW_H - 0.7;
    const poolFlow = flow(poolWidths, poolY);
    slots = prepared.map((w, i) => ({ ...slotFlow.pos[i], w: widths[i], item: null }));
    punctSlot = slotFlow.pos[prepared.length];
    words = [];
    slots.forEach((s, i) => {
      const t = makeTile({ kind: 'slot', w: s.w, h: 1.3 });
      t.position.set(s.x, s.y, 0);
      stage.root.add(t);
    });
    poolShuffled.forEach((w, k) => {
      const tile = makeTile({ kind: 'word', text: w.text, w: poolWidths[k], color: TILE_COLORS[(k + index) % TILE_COLORS.length] });
      const item = { id: w.id, tile, home: poolFlow.pos[k], slot: null };
      tile.position.set(item.home.x, item.home.y, 0);
      tile.userData.item = item;
      stage.root.add(tile);
      words.push(item);
    });
    const bottom = poolY - (poolFlow.rows - 1) * ROW_H - 0.8;
    const top = 2.3 + 0.8;
    stage.setContent(Math.max(slotFlow.maxW, poolFlow.maxW) + 1, top - bottom + 0.8);
    // recentre verticalement le contenu autour de y = 0
    stage.root.position.y = -(top + bottom) / 2;
    ui.setPrompt('Remets les mots dans l\'ordre !');
    ui.setDots(sentences.length, index);
    ui.setEmoji(sentence.emoji);
    ui.setBar([]);
    busy = true;
    await Promise.all(words.map((w, k) => wait(k * 0.06).then(() => popIn(w.tile, { z0: 0, z1: 0 }))));
    busy = false;
  }

  function freeSlot(item) {
    if (item.slot != null) { slots[item.slot].item = null; item.slot = null; }
  }

  async function toSlot(item, s) {
    freeSlot(item);
    slots[s].item = item;
    item.slot = s;
    sfx.pop();
    await moveTo(item.tile, slots[s].x, slots[s].y, 0.12, 0.28);
    if (slots.every((x) => x.item)) await checkSlots();
  }

  async function toPool(item) {
    freeSlot(item);
    await moveTo(item.tile, item.home.x, item.home.y, 0, 0.28);
  }

  async function checkSlots() {
    busy = true;
    const texts = slots.map((s) => s.item.tile.userData.spec.text);
    const res = checkOrder(sentence, texts);
    if (res.every(Boolean)) {
      sfx.success();
      await wait(0.2);
      startFinish();
      busy = false;
      return;
    }
    hints++;
    sfx.hint();
    ui.hint('Essaie encore !');
    const bad = slots.map((s, i) => (res[i] ? null : s.item)).filter(Boolean);
    await Promise.all(bad.map((it) => shake(it.tile, { amp: 0.15, dur: 0.35 })));
    await Promise.all(bad.map((it) => toPool(it)));
    busy = false;
  }

  function startFinish() {
    phase = 'finish';
    ui.setPrompt('Ajoute la majuscule et le point !');
    capBtn = btn('Aa  Majuscule', () => api.setCaps(!capitalized), 'sun');
    ptBtn = btn('.  Point', () => api.setPoint(!hasPoint), 'sun');
    ui.setBar([capBtn, ptBtn, btn('✓ Valider', () => api.validate(), 'primary')]);
  }

  async function setCaps(on) {
    if (phase !== 'finish') return;
    capitalized = on;
    const first = words.find((w) => w.slot === 0);
    const base = first.tile.userData.spec;
    const text = on ? upperFirst(base.text) : base.text.charAt(0).toLowerCase() + base.text.slice(1);
    retexture(first.tile, { ...base, text });
    capBtn.classList.toggle('pink', on);
    sfx.click();
    await jump(first.tile, { h: 0.3, dur: 0.3 });
  }

  async function setPoint(on) {
    if (phase !== 'finish') return;
    hasPoint = on;
    ptBtn.classList.toggle('pink', on);
    sfx.click();
    if (on && !punctTile) {
      punctTile = makeTile({ kind: 'punct', text: '.', color: 0x2b3a67 });
      punctTile.position.set(punctSlot.x, punctSlot.y, 0.12);
      stage.root.add(punctTile);
      await popIn(punctTile, { z0: 0.12, z1: 0.12, dur: 0.3 });
    } else if (!on && punctTile) {
      stage.root.remove(punctTile);
      punctTile = null;
    }
  }

  async function validate() {
    if (phase !== 'finish' || busy) return { ok: false, hint: 'busy' };
    const r = checkFinish(sentence, { capitalized, hasPoint });
    if (!r.ok) {
      hints++;
      sfx.hint();
      ui.hint(HINT_TEXT[r.hint]);
      return r;
    }
    busy = true;
    ui.setBar([]);
    sfx.success();
    confetti(100);
    speech.say(finalText(sentence));
    await Promise.all(slots.map((s, k) => wait(k * 0.1).then(() => jump(s.item.tile, { h: 0.6, dur: 0.45 }))));
    await wait(1.4);
    if (!alive) return r;
    index++;
    ui.setDots(sentences.length, index);
    if (index >= sentences.length) {
      busy = false;
      finish('phrase', level.id, hints);
      return r;
    }
    await build();
    busy = false;
    return r;
  }

  function nearestEmpty(p) {
    let best = -1;
    let bd = 1.6;
    slots.forEach((s, i) => {
      if (s.item) return;
      const d = Math.hypot(p.x - s.x, p.y - s.y);
      if (d < bd) { bd = d; best = i; }
    });
    return best;
  }

  function onTap(tile) {
    const item = tile.userData.item;
    if (!item || busy || phase !== 'order') return;
    if (item.slot != null) { toPool(item); return; }
    const s = slots.findIndex((x) => !x.item);
    if (s >= 0) toSlot(item, s);
  }

  function onDrop(tile, p) {
    const item = tile.userData.item;
    if (!item || busy) return;
    const s = p ? nearestEmpty(p) : -1;
    if (s >= 0) toSlot(item, s);
    else toPool(item);
  }

  const api = {
    start(levelId, { seed = Date.now(), index: startIndex = 0 } = {}) {
      api.dispose();
      alive = true;
      level = getSentenceLevel(levelId);
      rng = createRng(seed >>> 0);
      sentences = rng.shuffle(SENTENCES[level.id]).slice(0, level.count);
      index = Math.min(Math.max(0, startIndex), sentences.length - 1);
      hints = 0;
      input = createInput(stage, { tiles: tilesFn, onTap, onDrop });
      input.attach();
      return build();
    },
    dispose() {
      alive = false;
      if (input) input.detach();
      input = null;
      stage.clearRoot();
      stage.root.position.y = 0;
      words = [];
      slots = [];
    },
    state() {
      return {
        atelier: 'phrase', level: level && level.id, index, total: sentences.length, phase, hints, busy,
        sentence: sentence && sentence.text, capitalized, hasPoint,
        words: words.map((w) => ({ id: w.id, text: w.tile.userData.spec.text, slot: w.slot, ...clientOf(stage, w.tile) })),
        slots: slots.map((s) => ({ filled: !!s.item })),
      };
    },
    tap(id) { const w = words.find((x) => x.id === id); return w ? onTap(w.tile) : undefined; },
    setCaps, setPoint, validate,
    async solve() {
      const idle = async () => { for (let n = 0; n < 600 && busy; n++) await new Promise((r) => setTimeout(r, 15)); };
      await idle();
      if (phase === 'order') {
        for (let i = 0; i < slots.length; i++) {
          const w = words.find((x) => x.id === `w${i}`);
          if (w.slot !== i) {
            if (slots[i].item) await toPool(slots[i].item);
            await toSlot(w, i);
          }
          await idle();
        }
      }
      await idle();
      if (phase === 'finish') {
        await setCaps(true);
        await setPoint(true);
        await validate();
      }
    },
  };
  return api;
}
