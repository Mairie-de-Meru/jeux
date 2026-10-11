// Atelier 1 : tracer une lettre sur l'ardoise ; la lettre devient une lettre 3D en pâte à modeler.
import { getGlyph, LETTER_NAMES } from '../logic/glyphs.js';
import { createTraceSession, nextStroke, submitStroke } from '../logic/trace.js';
import { getTraceLevel, pickLetters, ROUND_SIZE } from '../logic/levels.js';
import { createRng } from '../logic/rng.js';
import { resample } from '../logic/trace.js';
import { createBoard, BOARD_CONTENT, CLAY_COLORS } from '../board.js';
import { createClay } from '../clay.js';
import { popIn, shake, wait, confetti } from '../fx.js';
import { sfx } from '../audio.js';
import { speech } from '../speech.js';
import { HINT_TEXT } from '../ui.js';

const STYLE_WORD = { caps: 'la capitale', script: 'la minuscule', cursive: 'la lettre attachée' };

export function createTracer({ stage, assets, ui, finish }) {
  let level = null;
  let letters = [];
  let index = 0;
  let session = null;
  let board = null;
  let clay = null;
  let hints = 0;
  let busy = false;
  let drawing = false;
  let pts = [];
  let offFrame = null;
  let alive = false;
  let rng = createRng(1);

  const cv = stage.canvas;

  function toGlyph(e) {
    const hit = stage.pick(e, [board.surface], false)[0];
    return hit ? board.toGlyph(hit.point) : null;
  }

  function down(e) {
    if (!alive || busy || !session) return;
    const p = toGlyph(e);
    if (!p) return;
    drawing = true;
    pts = [p];
    try { cv.setPointerCapture(e.pointerId); } catch (err) { /* id synthétique */ }
    board.setTrail(pts.slice());
  }
  function move(e) {
    if (!drawing) return;
    const p = toGlyph(e);
    if (!p) return;
    pts.push(p);
    board.setTrail(pts.slice());
  }
  function up() {
    if (!drawing) return;
    drawing = false;
    const p = pts;
    pts = [];
    submit(p);
  }

  async function loadLetter() {
    const letter = letters[index];
    const glyph = getGlyph(level.style, letter);
    session = createTraceSession(glyph, level.opts);
    board.setGlyph(glyph);
    ui.setDots(letters.length, index);
    const name = STYLE_WORD[level.style];
    ui.setPrompt(level.style === 'caps' ? `Trace ${letter.toUpperCase()}` : `Trace ${letter}`, false);
    speech.say(`Trace ${name} ${LETTER_NAMES[letter]}.`);
  }

  function submit(userPts) {
    if (!session || busy) return { accepted: false, hint: 'short', skipped: true };
    const r = submitStroke(session, userPts);
    board.setTrail(null);
    if (r.accepted) {
      sfx.pop();
      board.markDone(r.strokeIndex);
      board.setExpected(r.complete ? -1 : nextStroke(session));
      if (r.complete) success();
    } else {
      hints++;
      sfx.hint();
      if (r.hint) ui.hint(HINT_TEXT[r.hint] || 'Essaie encore !');
      shake(board.group, { amp: 0.08, dur: 0.25 });
    }
    return r;
  }

  async function success() {
    busy = true;
    const letter = letters[index];
    const glyph = session.glyph;
    clay = createClay(glyph, board.toLocal, CLAY_COLORS[index % CLAY_COLORS.length], null);
    clay.position.z = 0.02;
    board.group.add(clay);
    sfx.success();
    confetti(50);
    speech.say(LETTER_NAMES[letter]);
    await popIn(clay, { z0: 0.02, z1: 0.14 });
    await wait(1.2);
    if (!alive) return;
    board.group.remove(clay);
    clay.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    clay = null;
    index++;
    ui.setDots(letters.length, index);
    if (index >= letters.length) {
      busy = false;
      session = null;
      finish('tracer', level.id, hints);
      return;
    }
    await loadLetter();
    busy = false;
  }

  function strokePoints(i, noise = 0) {
    const t = session.glyph.strokes[i];
    return t.map((p, k) => ({
      x: p.x + (noise ? (rng.next() - 0.5) * 2 * noise : 0),
      y: p.y + (noise ? (rng.next() - 0.5) * 2 * noise : 0),
      k,
    }));
  }

  const api = {
    start(levelId, { seed = Date.now(), index: startIndex = 0 } = {}) {
      api.dispose();
      alive = true;
      level = getTraceLevel(levelId);
      rng = createRng(seed >>> 0);
      letters = pickLetters(level, rng, ROUND_SIZE);
      index = Math.min(Math.max(0, startIndex), letters.length - 1);
      hints = 0;
      busy = false;
      board = createBoard(assets);
      stage.root.add(board.group);
      stage.setContent(BOARD_CONTENT.w, BOARD_CONTENT.h);
      offFrame = stage.onFrame((dt, t) => board.update(t));
      cv.addEventListener('pointerdown', down);
      cv.addEventListener('pointermove', move);
      cv.addEventListener('pointerup', up);
      cv.addEventListener('pointercancel', up);
      ui.setEmoji('');
      ui.setBar([]);
      loadLetter();
    },
    dispose() {
      alive = false;
      cv.removeEventListener('pointerdown', down);
      cv.removeEventListener('pointermove', move);
      cv.removeEventListener('pointerup', up);
      cv.removeEventListener('pointercancel', up);
      if (offFrame) offFrame();
      offFrame = null;
      stage.clearRoot();
      board = null;
      session = null;
      clay = null;
      drawing = false;
    },
    state() {
      return {
        atelier: 'tracer', level: level && level.id, index, total: letters.length,
        letter: letters[index] || null, style: level && level.style, hints, busy,
        strokes: session ? session.glyph.strokes.length : 0,
        done: session ? session.done.slice() : [],
        expected: session ? nextStroke(session) : -1,
      };
    },
    // points en coordonnées du gabarit [0,1]
    traceStroke(points, { steps = 0 } = {}) {
      const p = steps && points.length > 1 ? resample(points, steps) : points;
      return submit(p);
    },
    traceLetter({ noise = 0 } = {}) {
      const out = [];
      if (!session) return out;
      for (let n = 0; n < 12 && session && !busy; n++) {
        const i = nextStroke(session);
        if (i < 0) break;
        out.push(submit(strokePoints(i, noise)));
        if (!out[out.length - 1].accepted) break;
      }
      return out;
    },
    solve() {
      return api.traceLetter({ noise: 0 });
    },
    // position écran (client) d'un point du gabarit
    boardToScreen(x, y) {
      return stage.project(board.toWorld(x, y));
    },
  };
  return api;
}
